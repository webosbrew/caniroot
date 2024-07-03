'use strict'

const fs = require('fs');
const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const {PurgeCSSPlugin} = require("purgecss-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

/** @type {import('@babel/core').RuleSetUse} */
const babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: ['@babel/preset-env'],
    // Without import: 'preact', `h is not defined` error will occur
    plugins: [['babel-plugin-htm', {'import': 'preact'}]]
  }
};

/**
 * @param {Record<string, unknown>} env
 * @param {Record<string, unknown>} argv
 * @returns {import('webpack').Configuration | import('webpack').Configuration[]}
 */
module.exports = (env, argv) => ({
  mode: 'development',
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 8080,
  },
  devtool: 'source-map',
  plugins: [
    new HtmlBundlerPlugin({
      entry: 'src',
      test: /\.(html)$/,
      loaderOptions: {
        root: path.join(__dirname, 'src'),
      },
      js: {
        filename: 'js/[name].[contenthash:8].js',
      },
      css: {
        filename: 'css/[name].[contenthash:8].css',
      },
    }),
    new PurgeCSSPlugin({
      /** @returns {string[]} */
      paths: () => {
        const entries = fs.readdirSync(path.resolve(__dirname, 'src'), {recursive: true, encoding: 'utf-8'});
        return entries.map(/**@param name{string}*/(name) => path.join('src', name));
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(m?js|ts)$/,
        exclude: /node_modules/,
        use: [
          babelLoader,
          {
            loader: 'ts-loader',
          }
        ]
      },
      {
        test: /\.(c|sa|sc)ss$/, use: [
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              api: 'modern',
              sassOptions: {
                style: 'expanded',
              }
            }
          }
        ]
      },
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimizer: [
      `...`,
      new CssMinimizerPlugin(),
    ]
  },
  target: ["web", "es5"],
  output: {
    clean: true,
  }
});