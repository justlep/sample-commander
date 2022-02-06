const webpack = require('webpack');
const {join} = require('path');

module.exports.getDefinePluginForNodeEnvProduction = () => new webpack.DefinePlugin({
    'process.env.NODE_ENV': '"production"'
});

module.exports.getDefinePluginFor__static = () => new webpack.DefinePlugin({
    __static: `"${join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
});
