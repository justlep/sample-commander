import { IS_WINDOWS } from '@/constants';
import Logger from '@/helpers/Logger.js';
const path = require('path');
const { getCurrentWindow, dialog } = require('@electron/remote');

/**
 * @param {string} [title]
 * @param {string} [preselectedPath] 
 * @return {Promise<any>}
 */
export async function selectSingleFolder({title = 'Select folder', preselectedPath = undefined}) {
    try {
        // https://github.com/electron/electron/blob/master/docs/api/dialog.md#dialogshowopendialogbrowserwindow-options
        let {canceled, filePaths} = await dialog.showOpenDialog(getCurrentWindow(), {
            title,
            defaultPath: preselectedPath || undefined,
            properties: ['openDirectory']
        });
        if (!canceled && filePaths && filePaths.length) {
            return filePaths[0];
        }
    } catch (err) {
        Logger.warn(err);
    }
    throw 'No folder selected';
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
export async function selectSingleFile({title = 'Select file', executable = false, preselectedFilePath}) {
    let defaultPath;
    if (preselectedFilePath) {
        try {
            defaultPath = path.dirname(preselectedFilePath) || undefined;
        } catch {
            // so what
        }
    }
    try {
        // https://github.com/electron/electron/blob/master/docs/api/dialog.md#dialogshowopendialogbrowserwindow-options
        let {filePaths, canceled} = await dialog.showOpenDialog(getCurrentWindow(), {
            title,
            defaultPath,
            filters: (executable && IS_WINDOWS) ? [{name: 'executables', extensions: ['exe', 'bat', 'cmd']}] : undefined,
            properties: ['openFile']
        });
        if (!canceled && filePaths && filePaths.length) {
            return filePaths[0];
        }
    } catch (err) {
        Logger.warn(err);
    }
    throw 'No file selected'
}
