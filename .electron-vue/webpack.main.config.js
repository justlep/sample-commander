'use strict';

process.env.BABEL_ENV = 'main';

const path = require('path');
const {dependencies} = require('../package.json');
const {getDefinePluginForNodeEnvProduction, getDefinePluginFor__static} = require('./webpack-define-plugin-helper.js');

const IS_ENV_PRODUCTION = process.env.NODE_ENV === 'production';

const mainConfig = {
    entry: {
        main: path.join(__dirname, '../src/main/index.js')
    },
    externals: [
        ...Object.keys(dependencies || {}),
        {'electron-debug': 'electron-debug'}
    ],
    module: {
        rules: [
            {
                test: /\.(js)$/,
                enforce: 'pre',
                exclude: /node_modules/,
                use: {
                    loader: 'eslint-loader',
                    options: {
                        formatter: 'stylish'
                    }
                }
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            }
        ]
    },
    node: {
        __dirname: !IS_ENV_PRODUCTION,
        __filename: !IS_ENV_PRODUCTION
    },
    optimization: {
        noEmitOnErrors: true
    },
    output: {
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        path: path.join(__dirname, '../dist/electron')
    },
    plugins: [
        ...(IS_ENV_PRODUCTION ? [
            // kicked BabiliWebpackPlugin here. might replace it w/ terser-webpack-plugin later
            getDefinePluginForNodeEnvProduction()
        ] : [
            getDefinePluginFor__static()
        ])
    ],
    resolve: {
        extensions: ['.js', '.json', '.node']
    },
    target: 'electron-main'
};

module.exports = mainConfig;
