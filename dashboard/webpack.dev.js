const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const utils = require('./utils');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    module: {
        rules: utils.styleLoaders({
            sourceMap: true
        })
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(__dirname, 'src', 'index.html'),
            inject: true
        }),
    ]
});
