'use strict'

const fs = require('fs');
const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const {PurgeCSSPlugin} = require("purgecss-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

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
    hot: true
  },
  devtool: argv.mode === 'production' && 'source-map',
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
          options: {presets: ['@babel/preset-env']}
        }
      },
      {test: /\.ts$/, use: 'ts-loader'},
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