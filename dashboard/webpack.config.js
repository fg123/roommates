// webpack.config.js
const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const utils = require('./utils');
const vueLoaderConfig = require('./vue-loader.conf');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
            'vue$': 'vue/dist/vue.esm.js',
            '@': './src',
        }
    },
    module: {
        rules: [
            // ... other rules
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: vueLoaderConfig
            },
            // this will apply to both plain `.js` files
            // AND `<script>` blocks in `.vue` files
            {
                test: /\.js$/,
                loader: 'babel-loader',
            },
        ].concat(utils.styleLoaders({
            sourceMap: false
        }))
    },
    plugins: [
        // make sure to include the plugin!
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin()
    ],
    entry: path.resolve(__dirname, 'src', 'main.js'),
    output: {
        path: path.resolve(__dirname, 'dist')
    }
};
