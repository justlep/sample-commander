'use strict';

const chalk = require('chalk');
const electron = require('electron');
const path = require('path');
const {spawn} = require('child_process');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackHotMiddleware = require('webpack-hot-middleware');

const mainConfig = require('./webpack.main.config');
const rendererConfig = require('./webpack.renderer.config');

let electronProcess = null;
let manualRestart = false;
let hotMiddleware;

function logStats(processName, data) {
    let log = chalk.yellow.bold(`┏ ${processName} Process ${'-'.repeat((19 - processName.length) + 1)}`) + '\n';
    if (typeof data === 'object') {
        data.toString({
            colors: true,
            chunks: false
        }).split(/\r?\n/).forEach(line => {
            log += '  ' + line + '\n'
        })
        log += '  ' + data.toString({colors: true, chunks: false}).replace(/\r?\n/g, '\n  ')
    } else {
        log += `  ${data}`
    }

    console.log(log + chalk.yellow.bold('\n┗ ' + '-'.repeat(29)) + '\n')
}

function startRenderer() {
    return new Promise((resolve, reject) => {
        rendererConfig.entry.renderer = [path.join(__dirname, 'dev-client')].concat(rendererConfig.entry.renderer);
        rendererConfig.mode = 'development';
        const compiler = webpack(rendererConfig);
        hotMiddleware = webpackHotMiddleware(compiler, {
            log: false,
            heartbeat: 2500
        });

        compiler.hooks.done.tap('done', stats => {
            logStats('Renderer', stats)
        });

        const server = new WebpackDevServer(
            compiler,
            {
                contentBase: path.join(__dirname, '../'),
                quiet: true,
                before(app, ctx) {
                    app.use(hotMiddleware);
                    ctx.middleware.waitUntilValid(() => {
                        resolve()
                    })
                }
            }
        );

        server.listen(9080)
    })
}

function startMain() {
    return new Promise((resolve, reject) => {
        mainConfig.entry.main = [path.join(__dirname, '../src/main/index.dev.js')].concat(mainConfig.entry.main);
        mainConfig.mode = 'development';
        const compiler = webpack(mainConfig);

        compiler.hooks.watchRun.tapAsync('watch-run', (compilation, done) => {
            logStats('Main', chalk.white.bold('compiling...'));
            hotMiddleware.publish({action: 'compiling'});
            done()
        });

        compiler.watch({}, (err, stats) => {
            if (err) {
                console.log(err);
                return
            }

            logStats('Main', stats);

            if (electronProcess && electronProcess.kill) {
                manualRestart = true;
                process.kill(electronProcess.pid);
                electronProcess = null;
                startElectron();

                setTimeout(() => {
                    manualRestart = false
                }, 5000)
            }

            resolve()
        })
    })
}

function startElectron() {
    let args = [
        '--inspect=5858',
        path.join(__dirname, '../dist/electron/main.js')
    ];

    // detect yarn or npm and process commandline args accordingly
    if (process.env.npm_execpath.endsWith('yarn.js')) {
        args.push(...args.concat(process.argv.slice(3)));
    } else if (process.env.npm_execpath.endsWith('npm-cli.js')) {
        args.push(...args.concat(process.argv.slice(2)));
    }

    electronProcess = spawn(electron, args);

    electronProcess.stdout.on('data', data => electronLog(data, 'blue'));
    electronProcess.stderr.on('data', data => electronLog(data, 'red'));
    electronProcess.on('close', () => manualRestart || process.exit());
}

function electronLog(data, color) {
    let log = data.toString().trim();
    if (log) {
        console.log(
            chalk[color].bold('┏ Electron -------------------\n') +
            '  ' + log.replace(/\r?\n/g, '\n  ') +
            chalk[color].bold('\n┗ ----------------------------') +
            '\n'
        )
    }
}

console.log(chalk.blue.bold('\n  dev-runner init...\n'));

Promise.all([
        startRenderer(),
        startMain()
    ])
    .then(() => setImmediate(startElectron))
    .catch(err => {
        console.error(err)
    });
