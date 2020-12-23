const { src, dest, watch, parallel, series } = require('gulp');
const bs = require('browser-sync').create(),
      // https://www.npmjs.com/package/gulp-file-include
      fileInclude = require('gulp-file-include'),
      ncp = require('ncp').ncp,
      sass = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      grouper = require('gulp-group-css-media-queries'),
      cleanCss = require('gulp-clean-css'),
      rename = require('gulp-rename'),
      webpack = require('webpack'),
      wps = require('webpack-stream'),
      changed = require('gulp-changed'),
      svgSprite = require('gulp-svg-sprite'),
      imagemin = require('gulp-image'),
      webp = require('gulp-webp'),
      rezzy = require('gulp-rezzy'),
      ttf2woff = require('gulp-ttf2woff'),
      ttf2woff2 = require('gulp-ttf2woff2'),
      ttf2eot = require('gulp-ttf2eot'),
      fonter = require('gulp-fonter'),
      sourcemaps = require('gulp-sourcemaps'),
      fs = require('fs'),
      process = require('process');

const isDev = process.env.NODE_ENV === 'development';
const isProd = !isDev;

const proj = (cb) => {
  const args = process.argv.slice(3);
  const [ dashedProjectName ] = args;
  const projectName = dashedProjectName && dashedProjectName.replace('--', '');

  const newProjectDirectory = `./projects/${projectName}`;
  
  if (fs.existsSync(newProjectDirectory)) {
    console.warn('Project already exists');
    return;
  }

  const folder = createFolders('projects', newProjectDirectory);

  let packageJson = fs.readFileSync('./_project-templates/package.json', 'utf-8');
  packageJson = packageJson.replace('project', projectName);
  fs.writeFileSync(`${folder.projectName}/package.json`, packageJson, 'utf8');
  fs.copyFileSync('./_project-templates/index.scss', `${folder.stylePath}/index.scss`);
  fs.copyFileSync('./_project-templates/webpack.config.ts', `${folder.projectName}/webpack.config.ts`);
  fs.copyFileSync('./_project-templates/index.tsx', `${folder.jsPath}/index.tsx`);
  fs.copyFileSync('./_project-templates/tsconfig.json', `${folder.projectName}/tsconfig.json`);
  fs.copyFileSync('./_project-templates/getWebp.js', `${folder.projectName}/getWebp.js`);
  fs.copyFileSync('./_project-templates/.babelrc', `${folder.projectName}/.babelrc`);
  fs.copyFileSync('./_project-templates/.eslintrc', `${folder.projectName}/.eslintrc`);
  ncp('./_sass-helpers', `${folder.stylePath}/helpers`);
  let html = fs.readFileSync('./_project-templates/index.html', 'utf-8');
  html = html.replace('/project/', projectName);
  fs.writeFileSync(`${folder.src}/index.html`, html, 'utf8');

  console.log(`Project created at ${folder.projectName}`);
  
  cb();
};

const layout = (cb) => {
  const args = process.argv.slice(3);
  const [ dashedProjectName ] = args;
  const projectName = dashedProjectName && dashedProjectName.replace('--', '');

  const newProjectDirectory = `./layouts/${projectName}`;
  
  if (fs.existsSync(newProjectDirectory)) {
    console.warn(`${projectName} layout project already exists, gulp config switched to work with it`);
    const folder = createFolders('layouts', newProjectDirectory);
    getConfigJson(folder);
    return cb();
  }
  const folder = createFolders('layouts', newProjectDirectory);
  const cfg = getConfigJson(folder);
  createFiles(cfg);
  console.log(`Layout project created at ${projectName}`);
  
  cb();
};

const page = (cb) => {
  const cfg = require('./config.json');
  const args = process.argv.slice(3);
  const [ dashedPageName ] = args;
  const pageName = dashedPageName && dashedPageName.replace('--', '');
  const currentPage = cfg.src.js.split('/').slice(-1)[0].replace('.js', '');
  let buffer = cfg;
  buffer.src.js = buffer.src.js.replace(currentPage, pageName);
  buffer.src.style = buffer.src.style.replace(currentPage, pageName);
  fs.writeFileSync('config.json', JSON.stringify(buffer, null, ' '), 'utf8');
  const pageExists = fs.existsSync(buffer.src.html.replace('*', pageName));
  if (pageExists) {
    console.log('Page already exists, gulp config switched to work with it.');
    return cb();
  }

  let html = fs.readFileSync('./_layout-templates/index.html', 'utf-8');
  html = html.replace(/index/g, pageName);
  const scss = fs.readFileSync('./_layout-templates/index.scss', 'utf-8');
  fs.writeFileSync(buffer.src.html.replace('*', pageName), html, 'utf8');
  fs.writeFileSync(buffer.src.style, scss, 'utf8');
  fs.writeFileSync(buffer.src.js, '', 'utf8');
  console.log(`Page '${pageName}' created, gulp config switched to work with it.`);
  
  return cb();
};

const runServer = () => {
  const cfg = require('./config.json');

  bs.init({
    server: {
      baseDir: cfg.build.html
    },
    port: 3333,
    https: true
  });
};

const html = () => {
  const cfg = require('./config.json');

  return src(cfg.src.html)
    .pipe(fileInclude())
    .pipe(dest(cfg.build.html))
    .on('end', bs.reload);
};

const scss = () => {
  const cfg = require('./config.json');

  let buffer = src(cfg.src.style);
    
  if (isDev) {
    return buffer
      .pipe(sourcemaps.init())
      .pipe(sass({ outputStyle: 'expanded' }))
      .pipe(sourcemaps.write('./'))
      .pipe(rename({
        extname: '.min.css'
      }))
      .pipe(dest(cfg.build.style))
      .on('end', bs.reload);
  }
  return buffer
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(autoprefixer({
      overrideBrowserslist: ['last 5 versions', 'not dead'],
      cascade: true
    }))
    .pipe(grouper())
    .pipe(dest(cfg.build.style))
    .pipe(cleanCss({
      compatibility: 'ie9'
    }))
    .pipe(rename({
      extname: '.min.css'
    }))
    .pipe(dest(cfg.build.style));
};

const wpcfg = {
  mode: isDev ? 'development': 'production', 
  entry: {},
  output: {
    filename: '[name].js'
  },
  module: {
    rules : [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: [
          'babel-loader'
        ],
      },
    ]
}};

const js = () => {
  const cfg = require('./config.json');
  const name = cfg.src.js.split('/').slice(-1)[0].replace('.js', '');
  wpcfg.entry[name] = cfg.src.js;

  if (isDev) {
    return src(cfg.src.js)
      .pipe(
        wps(
          {
            ...wpcfg, 
            devtool: 'source-map', 
          },
          webpack
        )
      )
      .pipe(dest(cfg.build.js))
      .on('end', bs.reload);
  }
  return src(cfg.src.js)
    .pipe(
      wps(
        wpcfg,
        webpack
      )
    )
    .pipe(dest(cfg.build.js));
};

const optimizeImages = (cb) => {
  const cfg = require('./config.json');
  if(isProd && !isIndexCfg()) return cb();

  return src(cfg.src.img)
    .pipe(changed(cfg.build.img))
    .pipe(imagemin({
      pngquant: true,
      optipng: true,
      zopflipng: true,
      jpegRecompress: ['--strip', '--quality', 'high', '--min', 60, '--max', 90],
      mozjpeg: ['-optimize', '-progressive'],
      gifsicle: true,
      svgo: ['--disable', 'removeViewBox', '--enable', 'cleanupIDs']
    }))
    .pipe(dest(cfg.build.img))
    .pipe(src(cfg.src.img))
    .pipe(webp({
      quality: 70
    }))
    .pipe(dest(cfg.build.img));
};

const sprite = (cb) => {
  const cfg = require('./config.json');
  if(isProd && !isIndexCfg()) return cb();

  return src(`${cfg.build.img}svg/*.svg`)
    .pipe(svgSprite({
      mode: {
        stack: {
          example: true
        },
        symbol: true
      }
    }))
    .pipe(dest(`${cfg.build.img}svg`));
};

const fonts = (cb) => {
  const cfg = require('./config.json');
  if(isProd && !isIndexCfg()) return cb();

  return src(cfg.src.fonts)
    .pipe(ttf2eot())
    .pipe(dest(cfg.build.fonts))
    .pipe(src(cfg.src.fonts))
    .pipe(ttf2woff())
    .pipe(dest(cfg.build.fonts))
    .pipe(src(cfg.src.fonts))
    .pipe(ttf2woff2())
    .pipe(dest(cfg.build.fonts));
};

const includeFontsToSass = (cb) => {
  const cfg = require('./config.json');
  const fontsFile = cfg.src.style.replace('index', 'fonts');
  if (!fs.existsSync(cfg.build.fonts)) {
    return cb();
  }
  const files = fs.readdirSync(cfg.build.fonts);
  for (const file of files) {
    let fontsFileContent = fs.readFileSync(fontsFile, 'utf-8');
    const fileName = file.split('.')[0];
    if (fontsFileContent.indexOf(fileName) === -1) {
      fs.appendFileSync(fontsFile, `@include fface('${fileName}', '${fileName}');\n`);
    } else {
      continue;
    }
  }
  return cb();
};

const otf2ttf = (cb) => {
  const cfg = require('./config.json');
  if(isProd && !isIndexCfg()) return cb();

  return src(cfg.src.fonts.replace('.ttf', '.otf'), { allowEmpty: true })
    .pipe(fonter({
      formats: ['ttf']
    }))
    .pipe(dest(cfg.build.fonts.replace('dist', 'src')));
};

const resize = (cb) => {
  const args = process.argv.slice(3);
  const [ dashedWidthsAndSuffixes ] = args;
  const widthsAndSuffixes = dashedWidthsAndSuffixes && dashedWidthsAndSuffixes.replace('--', '');
  const cfg = require('./config.json');
  const resizeSrc = cfg.src.img.replace('images', 'resize');
  const resizeBuild = cfg.src.img.replace('**/*.{jpg,png,svg}', '');

  if (!widthsAndSuffixes) {
    if (!cfg.lastResizeString) {
      return cb();
    }
    const resizeConfig = getResizeConfig(cfg.lastResizeString);
    return src(resizeSrc)
      .pipe(rezzy(resizeConfig))
      .pipe(dest(resizeBuild));
  }
  fs.writeFileSync('./config.json', JSON.stringify({ ...cfg, lastResizeString: widthsAndSuffixes }, null, ' '), 'utf8');

  const resizeConfig = getResizeConfig(widthsAndSuffixes);
  
  return src(resizeSrc)
    .pipe(rezzy(resizeConfig))
    .pipe(dest(resizeBuild));
};

const watcher = (cb) => {
  const cfg = require('./config.json');

  watch(cfg.watch.html, series('html'));
  watch(cfg.watch.style, series('sass'));
  watch(cfg.watch.js, series('js'));
  watch(cfg.watch.img, series('optimizeImages'));
  watch(cfg.src.img.replace('images', 'resize'), series('resize'));
  watch(cfg.watch.img.replace('src', 'dist').replace('**/*.{jpg,png,svg}', 'svg/*.svg'), series('sprite'));
  watch(cfg.watch.fonts, series('fonts', 'includeFontsToSass'));
  watch(cfg.watch.fonts.replace('.ttf', '.otf'), series('otf2ttf'));
  
  cb();
};

const build = series(
  otf2ttf,
  fonts,
  includeFontsToSass,
  parallel(
    html,
    scss,
    js,
    optimizeImages
  ),
  sprite,
);


exports.default = series(
  build,
  watcher,
  runServer,
);

exports.proj = proj;
exports.layout = layout;
exports.page = page;
exports.runServer = runServer;
exports.html = html;
exports.sass = scss;
exports.js = js;
exports.optimizeImages = optimizeImages;
exports.sprite = sprite;
exports.fonts= fonts;
exports.includeFontsToSass = includeFontsToSass;
exports.otf2ttf = otf2ttf;
exports.resize = resize;
exports.watcher = watcher;
exports.build = build;

function createFolders (projects, projectName) {
  const src = `${projectName}/src`;
  const jsPath = `${src}/ts`;
  const stylePath = `${src}/style`;
  const imagesPath = `${src}/images`;
  const fontsPath = `${src}/fonts`;

  !fs.existsSync(`./${projects}`) && fs.mkdirSync(`./${projects}`);
  !fs.existsSync(projectName) && fs.mkdirSync(projectName);
  !fs.existsSync(src) && fs.mkdirSync(src);
  !fs.existsSync(jsPath) && fs.mkdirSync(jsPath);
  !fs.existsSync(fontsPath) && fs.mkdirSync(fontsPath);
  !fs.existsSync(stylePath) && fs.mkdirSync(stylePath);
  !fs.existsSync(imagesPath) && fs.mkdirSync(imagesPath);
  !fs.existsSync(`${imagesPath}/jpg`) && fs.mkdirSync(`${imagesPath}/jpg`);
  !fs.existsSync(`${imagesPath}/png`) && fs.mkdirSync(`${imagesPath}/png`);
  !fs.existsSync(`${imagesPath}/svg`) && fs.mkdirSync(`${imagesPath}/svg`);
  if (projects === 'layouts') {
    const resizePath = `${src}/resize`;
    !fs.existsSync(resizePath) && fs.mkdirSync(resizePath);
    !fs.existsSync(`${resizePath}/jpg`) && fs.mkdirSync(`${resizePath}/jpg`);
    !fs.existsSync(`${resizePath}/png`) && fs.mkdirSync(`${resizePath}/png`);
    !fs.existsSync(`${src}/templates`) && fs.mkdirSync(`${src}/templates`);
  }
  return {
    projectName,
    imagesPath,
    stylePath,
    fontsPath,
    jsPath,
    src
  };
}

function createFiles(cfg) {
  const html = fs.readFileSync('./_layout-templates/index.html', 'utf-8');
  const scss = fs.readFileSync('./_layout-templates/index.scss', 'utf-8');
  ncp('./_sass-helpers', cfg.src.style.replace('index.scss', 'helpers'), () => {
    console.log('helpers copied');
  });
  ncp('./_layout-templates/templates', cfg.src.html.replace('*.html', 'templates'));
  fs.writeFileSync(cfg.src.html.replace('*', 'index'), html, 'utf8');
  fs.writeFileSync(cfg.src.style, scss, 'utf8');
  fs.writeFileSync(cfg.src.style.replace('index', 'fonts'), '', 'utf8');
  fs.writeFileSync(cfg.src.js, '', 'utf8');
}

function getConfigJson (folder) {
  const path = {
    build: {
      html: `${folder.src.replace('src', 'dist')}/`,
      style: `${folder.stylePath.replace('src', 'dist')}/`,
      js: `${folder.jsPath.replace('src', 'dist')}/`,
      img: `${folder.imagesPath.replace('src', 'dist')}/`,
      fonts: `${folder.fontsPath.replace('src', 'dist')}/`
    },
    src: {
      html: `${folder.src}/*.html`,
      style: `${folder.stylePath}/index.scss`,
      js: `${folder.jsPath}/index.js`,
      img: `${folder.imagesPath}/**/*.{jpg,png,svg}`,
      fonts: `${folder.fontsPath}/**/*.ttf`
    },
    watch: {
      html: `${folder.src}/**/*.html`,
      style: `${folder.stylePath}/**/*.scss`,
      js: `${folder.jsPath}/**/*.js`,
      img: `${folder.imagesPath}/**/*.{jpg,png,svg}`,
      fonts: `${folder.fontsPath}/**/*.ttf`
    }
  };

  fs.writeFileSync('config.json', JSON.stringify(path, null, ' '), 'utf8');
  return path;
}

function isIndexCfg() {
  const cfg = require('./config.json');
  return cfg.src.js.split('/').slice(-1)[0].replace('.js', '') === 'index';
}

function getResizeConfig(widthsAndSuffixesString) {
  return widthsAndSuffixesString
    .split('/')
    .reduce((prev, curr) => {
      const [width, suffix] = curr.split('-');
      return [...prev, { width: Number(width), suffix: `-${suffix}` }];
    }, []);
}
