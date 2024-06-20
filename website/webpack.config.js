'use strict'

const fs = require('fs');
const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const {PurgeCSSPlugin} = require("purgecss-webpack-plugin");

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  mode: 'development',
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 8080,
    hot: true
  },
  plugins: [
    new HtmlBundlerPlugin({
      entry: 'src',
      test: /\.(html)$/,
      loaderOptions: {
        root: path.join(__dirname, 'src'),
      },
      hotUpdate: true,
      js: {
        filename: 'js/[name].[contenthash:8].js',
      },
      css: {
        filename: 'css/[name].[contenthash:8].css',
      },
    }),
    new PurgeCSSPlugin({
      paths: () => fs.readdirSync(path.resolve(__dirname, 'src'), {recursive: true})
        .map((name) => path.join('src', name)),
    }),
  ],
  module: {
    rules: [
      {
        test: /.m?js$/, use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          }
        }
      },
      {test: /\.ts$/, use: 'ts-loader'},
      {test: /\.css$/, use: ['css-loader']},
      {test: /\.scss$/, use: ['css-loader', 'sass-loader']},
      // fonts
      {
        test: /\.woff2?(\?v=.+)?$/,
        type: "asset/resource",
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },
  target: ["web", "es5"],
  output: {
    clean: true,
  }
};