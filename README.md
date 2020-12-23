# gulp-helper
#### win 10
#### node 14.15.3
#### yarn 1.22.10

Helps me to start new projects and build layouts

##### gulp proj ```--[name]``` 
Creates new react project in ```'./projects/[name]'``` directory.  
Open it in new IDE window and do something cool.
  
---
  
##### gulp layout ```--[name]```
Writes ```./config.json``` for gulp, which looks like:  
```
{
  "build": {
    "html": "./layouts/[name]/dist/",
    "style": "./layouts/[name]/dist/style/",
    "js": "./layouts/[name]/dist/js/",
    "img": "./layouts/[name]/dist/images/",
    "fonts": "./layouts/[name]/dist/fonts/"
  },
  "src": {
    "html": "./layouts/[name]/src/*.html",
    "style": "./layouts/[name]/src/style/index.scss",
    "js": "./layouts/[name]/src/js/index.js",
    "img": "./layouts/[name]/src/images/**/*.{jpg,png,svg}",
    "fonts": "./layouts/[name]/src/fonts/**/*.ttf"
  },
  "watch": {
    "html": "./layouts/[name]/src/**/*.html",
    "style": "./layouts/[name]/src/style/**/*.scss",
    "js": "./layouts/[name]/src/js/**/*.js",
    "img": "./layouts/[name]/src/images/**/*.{jpg,png,svg}",
    "fonts": "./layouts/[name]/src/fonts/**/*.ttf"
  },
}
```  
And creates new layout-like project in ```'./layouts/[name]'``` directory:
```
src/
  fonts/
  images/
    jpg/
    png/
    svg/
  js/
    index.js
  resize/
    jpg/
    png/
    svg/
  style/
    helpers/
      animations/
        ...some animations
      mixins/
        ...some mixins
      functions.scss
      variables.scss
    fonts.scss
    index.scss
  templates/
    header.html
    footer.html
  index.html
```
##### gulp page ```--[name]```
Creates new page ```([name].html, [name].scss, [name].js)``` in layout-like project and rewrite ```./config.json``` to make gulp watch it changes.
##### yarn build
Builds page of layout-like project to it ```dist/``` directory.
##### yarn start
Builds page of layout-like project and runs dev server at ```https://localhost:3333/```

##### gulp resize ```--[width]-[suffix]/... e.g --1600-large/1366-desktop/768-tablet/375-mobile```
Resizes images from ```.src/resize``` directory to those widths specified in the console.  
PS. ```--[width]-[suffix]/...``` string is now written to ```./config.json``` so you can just add images to ```./src/resize/[jpg/png]```