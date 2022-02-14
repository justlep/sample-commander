/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

// Install `electron-debug` with `devtron`

require('electron-debug')({
    isEnabled: true,
    showDevTools: true,
    devToolsMode: 'undocked'
});

// install vue-devtools..

const installExtension = require('electron-devtools-installer')

require('electron').app.on('ready', () => {
    installExtension.default(installExtension.VUEJS_DEVTOOLS)
        .then(() => console.log('Installed vue-devtools')) // eslint-disable-line
        .catch(err => console.log('Unable to install `vue-devtools`: \n', err)) // eslint-disable-line
    }
);

// Require `main` process to boot app
require('./index');
