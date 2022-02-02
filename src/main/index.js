import {app, BrowserWindow, nativeImage, ipcMain, protocol} from 'electron'
import {
    IPC_PREPARE_SHUTDOWN, 
    IPC_SHUTDOWN_PREPARED, 
    IPC_SET_EXTERNALLY_DRAGGED_FILES, 
    IS_DEV,
    IPC_GO_BACK_PRESSED } from '../renderer/constants'
import electronWindowState from 'electron-window-state'
import ElectronStore from 'electron-store';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (!IS_DEV) {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow,
    createMainWindow = function() {
        if (mainWindow) {
            return;
        }

        ElectronStore.initRenderer();
        
        const URL = IS_DEV ? 'http://localhost:9080' : `file://${__dirname}/index.html`;
        
        // Load the previous state with fallback to defaults
        let winState = electronWindowState({
                defaultWidth: 800,
                defaultHeight: 600
            }),
            isPreparingShutdown = false,
            isShutdownPrepared = false;
        
        mainWindow = new BrowserWindow({
            x: winState.x,
            y: winState.y,
            width: winState.width,
            height: winState.height,
            useContentSize: false,
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true,
                webSecurity: false,
                enableRemoteModule: true
            },
            icon: nativeImage.createFromDataURL('data:image/png;base64,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')
        });

        mainWindow.setMenu(null);
        mainWindow.setMenuBarVisibility(false);
        
        winState.manage(mainWindow);
        
        mainWindow.webContents.on('will-navigate', e => e.preventDefault());
    
        mainWindow.on('app-command', (e, cmd) => {
            if (cmd === 'browser-backward') {
                mainWindow.webContents.send(IPC_GO_BACK_PRESSED);
                // console.warn('*** browser-back -> %s', mainWindow.webContents.canGoBack());
                // mainWindow.webContents.goBack()
            }
        });
    
        mainWindow.on('closed', () => mainWindow = null);
    
        mainWindow.on('close', async function(e){
            if (isShutdownPrepared) {
                // all ready -> just let closing happen
                return;
            }
            e.preventDefault();
            if (!isPreparingShutdown) {
                isPreparingShutdown = true;
                mainWindow.webContents.send(IPC_PREPARE_SHUTDOWN);
            }
        });
    
        ipcMain.once(IPC_SHUTDOWN_PREPARED, () => {
            isShutdownPrepared = true;
            mainWindow.close();
        });

        mainWindow.webContents.on('new-window', function(e, url) {
            e.preventDefault();
            require('electron').shell.openExternal(url);
        });

        // 'webSecurity: false' breaks the file:// scheme in Electron 9. 
        // Using solution from Github issue here:
        // https://github.com/electron/electron/issues/23757#issuecomment-774543351
        protocol.registerFileProtocol('file', (request, callback) => {
            const pathname = decodeURIComponent(request.url.replace('file:///', ''));
            callback(pathname);
        });
        
        mainWindow.loadURL(URL);
    };

app.on('ready', createMainWindow);
app.on('activate', createMainWindow);
app.on('window-all-closed', () => (process.platform !== 'darwin') && app.quit());

ipcMain.on(IPC_SET_EXTERNALLY_DRAGGED_FILES, (event, filePathOrPaths) => {
    let paths = Array.isArray(filePathOrPaths) ? filePathOrPaths : (typeof filePathOrPaths === 'string') ? [filePathOrPaths] : null;
    if (paths && paths.length) {
        // console.warn('Setting dragged files: %o', paths.join(','));

        // (!) Know bug: looks like Electron still can't handle multiple dragged files on Windows (04/2018) 

        // documentation -> https://electronjs.org/docs/api/web-contents#contentsstartdragitem
        event.sender.startDrag({
            files: paths,
            //icon: nativeImage.createEmpty() // <-- stopped working in Windows :/
            icon: nativeImage.createFromDataURL('data:image/png;base64,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')
        });
    }
});
