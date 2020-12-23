import path from 'path';
import webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import CssMinimizerWebpackPlugin from 'css-minimizer-webpack-plugin';
import EslintPlugin from 'eslint-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserWebpackPlugin from 'terser-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import autoprefixer from 'autoprefixer';
const isDev = process.env.NODE_ENV === 'development';

const cssLoaders = [
  {
    loader: MiniCssExtractPlugin.loader
  },
  'css-loader'
];

const getFileName = (extension: string) => 
  isDev 
    ? `[name].${extension}`
    : `[name].[chunkhash].${extension}`;

const getPlugins = () => {
  const plugins = [
    new ForkTsCheckerWebpackPlugin({
      async: false,
      eslint: {
        files: './src/**/*.{ts,tsx,js,jsx}',
      },
    }),
    new HTMLWebpackPlugin({
      template: './src/index.html',
      minify: {
        collapseWhitespace: !isDev
      }
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: getFileName('css')
    }),
    new EslintPlugin(
      // {}
    )
    // new CopyWebpackPlugin()
  ];

  if (!isDev) {
    return [ ...plugins, new BundleAnalyzerPlugin() ];
  }

  return plugins;
};

const cfg: webpack.Configuration = {
  mode: isDev ? 'development' : 'production',
  entry: {
    index: './src/ts/index.tsx',
  },
  output: {
    filename: getFileName('js'),
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss'],
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    https: true,
    compress: true,
    open: true,
    port: 7777,
    // proxy: {
    //   '/': {
    //     target: '',
    //     changeOrigin: true,
    //     secure: false
    //   }
    // },
    hot: true
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    },
    minimizer: isDev ? [] : [
      new CssMinimizerWebpackPlugin({
        cache: true
      }),
      new TerserWebpackPlugin()
    ]
  },
  plugins: getPlugins(),
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: cssLoaders
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          ...cssLoaders,
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: isDev,
              postcssOptions: {
                plugins: [
                  autoprefixer()
                ]
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
                sourceMap: isDev
            }
        }
        ]
      },
      {
        test: /.(png|jpe?g|gif|webp)$/i,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                quality: 65,
                progressive: true
              },
              pngquant: {
                quality: [0.65, 1],
                speed: 4
              },
              gifsicle: {
                interlaced: false,
              },
              webp: {
                quality: 25
              }
            }
          }
        ]
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'svg-url-loader',
          options: {}
        }
      },
      {
        test: /.(woff|woff2|eot)$/,
        use: ['file-loader']
      }
    ]
  }
};

export default cfg;