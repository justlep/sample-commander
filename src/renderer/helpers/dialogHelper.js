import { IS_WINDOWS } from '@/constants'
const { dialog, getCurrentWindow } = require('electron').remote;

/**
 * @param {string} [title]
 * @param {string} [preselectedPath] 
 * @return {Promise<any>}
 */
export function selectSingleDirectory({title = 'Select directory', preselectedPath = undefined}) {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog(getCurrentWindow(), {
            title,
            defaultPath: preselectedPath || undefined,
            properties: ['openDirectory']
        }, dirs => {
            if (dirs && dirs.length) {
                resolve( dirs[0] );
            } else {
                reject('No directory selected');
            }
        });
    });
}

/**
 * @param {string} title 
 * @param {boolean} executable - if true, only executable file extensions will be selectable 
 * @return {Promise<any>}
 * TODO add file extension filter option
 *       filters: [
 *          {name: 'xml', extensions: ['xml'] }
 *       ]
 */
export function selectSingleFile({title = 'Select file', executable = false}) {
    let filters;

    if (executable && IS_WINDOWS) {
        filters = [{
            name: 'executables',
            extensions: ['exe', 'bat', 'cmd']
        }];
    }
    
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog(getCurrentWindow(), {
            title,
            filters,
            properties: ['openFile']
        }, files => {
            if (files && files.length) {
                resolve( files[0] );
            } else {
                reject('No file selected');
            }
        });
    });
}
