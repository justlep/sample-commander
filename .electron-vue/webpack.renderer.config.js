'use strict';

process.env.BABEL_ENV = 'renderer';

const path = require('path');
const {dependencies, version} = require('../package.json');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {VueLoaderPlugin} = require('vue-loader');
const {getDefinePluginForNodeEnvProduction, getDefinePluginFor__static} = require('./webpack-define-plugin-helper.js');

const IS_ENV_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * List of node_modules to include in webpack bundle
 *
 * Required for specific packages like Vue UI libraries
 * that provide pure *.vue files that need compiling
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/webpack-configurations.html#white-listing-externals
 */
const whiteListedModules = ['vue'];

const rendererConfig = {
    devtool: IS_ENV_PRODUCTION ? undefined : 'eval-cheap-module-source-map',
    entry: {
        renderer: path.join(__dirname, '../src/renderer/main.js')
    },
    externals: [
        ...Object.keys(dependencies || {}).filter(d => !whiteListedModules.includes(d))
    ],
    module: {
        rules: [
            {
                test: /\.(js|vue)$/,
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
                test: /\.scss$/,
                use: ['vue-style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.sass$/,
                use: ['vue-style-loader', 'css-loader', 'sass-loader?indentedSyntax']
            },
            {
                test: /\.less$/,
                use: ['vue-style-loader', 'css-loader', 'less-loader']
            },
            {
                test: /\.css$/,
                use: ['vue-style-loader', 'css-loader']
            },
            // {
            //     test: /\.html$/,
            //     use: 'vue-html-loader'
            // },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            },
            {
                test: /\.vue$/,
                use: {
                    loader: 'vue-loader',
                    options: {
                        extractCSS: IS_ENV_PRODUCTION,
                        loaders: {
                            sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1',
                            scss: 'vue-style-loader!css-loader!sass-loader',
                            less: 'vue-style-loader!css-loader!less-loader'
                        }
                    }
                }
            },
            {
                test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'imgs/[name]--[folder].[ext]'
                    }
                }
            },
            {
                test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: 'media/[name]--[folder].[ext]'
                }
            },
            {
                test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'fonts/[name]--[folder].[ext]'
                    }
                }
            },
            {
                test: /\.pug$/,
                loader: 'pug-plain-loader'
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
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({filename: 'styles.css'}),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            title: `LeP's Sample Commander v${version}`,
            template: path.resolve(__dirname, '../src/index.ejs'),
            minify: {
                collapseWhitespace: true,
                removeAttributeQuotes: true,
                removeComments: true
            },
            nodeModules: IS_ENV_PRODUCTION ? false : path.resolve(__dirname, '../node_modules')
        }),
        new webpack.HotModuleReplacementPlugin(),
        ...(IS_ENV_PRODUCTION ? [
            // TODO kicked BabiliWebpackPlugin here. Maybe replace it w/ terser-webpack-plugin later
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(__dirname, '../static'),
                        to: path.join(__dirname, '../dist/electron/static'),
                        filter: f => !f.endsWith('fontello.zip')
                    }
                ]
            }),
            getDefinePluginForNodeEnvProduction()
        ] : [
            getDefinePluginFor__static()
        ])
    ],
    output: {
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        path: path.join(__dirname, '../dist/electron')
    },
    resolve: {
        alias: {
            '@': path.join(__dirname, '../src/renderer'),
            'vue$': 'vue/dist/vue.esm.js'
        },
        extensions: ['.js', '.vue', '.json', '.css', '.node']
    },
    target: 'electron-renderer'
};

module.exports = rendererConfig;
