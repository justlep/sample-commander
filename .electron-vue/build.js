'use strict';

process.env.NODE_ENV = 'production';

const chalk = require('chalk');
const del = require('del');
const webpack = require('webpack');

if (process.env.BUILD_TARGET === 'clean') {
    del.sync(['build/*', '!build/icons', '!build/icons/icon.*']);
    console.log(chalk.bgGreen.white('\nDONE\n'));
    process.exit();
}

const packOrExit = (config, processName) => new Promise(resolve => {
    config.mode = 'production';
    webpack(config, (err, stats) => {
        const statsString = stats?.toString({
            chunks: false,
            colors: true
        });

        let errorMsg = err ? (err.stack || err) : stats.hasErrors() ? `    ${statsString.replace(/\r?\n/g, '\n    ')}` : null;
        if (errorMsg) {
            console.log(`\n${chalk.bgRed.white('ERROR')} failed to build ${processName}`);
            console.error(`\n${errorMsg}\n`);
            process.exit(1)
        }
        resolve(statsString);
    })
});

console.log(chalk.yellow.bold('\n  lets-build\n'));

del.sync(['dist/electron/*', '!.gitkeep']);

console.log('Building main & renderer processes...');

Promise.all([
    packOrExit(require('./webpack.main.config'), 'main process'),
    packOrExit(require('./webpack.renderer.config'), 'renderer process')
]).then(([log1, log2]) => {
    console.log(`\n\n${log1}\n\n${log2}\n\n${chalk.bgBlue.white('OKAY')} take it away ${chalk.yellow('`electron-builder`')}\n`);
    process.exit();
});
