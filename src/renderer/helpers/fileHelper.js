import path from 'path'
const promisify = require('util').promisify;
const fs = require('fs');

// const glob = require('glob');
// const readFile = promisify(fs.readFile);
// const writeFile = promisify(fs.writeFile);
export const copyFile = promisify(fs.copyFile);
export const mkdir = promisify(fs.mkdir);
export const unlink = promisify(fs.unlink);
export const stat = promisify(fs.stat);
export const rename = promisify(fs.rename);
export const access = promisify(fs.access);

export const COPYFILE_NO_OVERWRITE_FLAG = fs.constants.COPYFILE_EXCL;

export async function pathExists(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
        throw 'Invalid path';
    }

    let fullPath = path.resolve(targetPath),
        exists = false;

    try {
        let statForPath = fullPath && await stat(fullPath);
        exists = !!(statForPath && (statForPath.isFile() || statForPath.isDirectory()));
    } catch (err) {
        // not ok
    }
    return exists;
}

/**
 * @param {string} path
 * @return {Promise<*>} resolves if executable, otherwise rejects
 */
export function assertFileIsExecutable(path) {
    if (path && typeof path === 'string') {
        return access(path, fs.constants.X_OK).then(() => path);
    }
    return Promise.reject();
}

/**
 * @param {string} targetPath
 * @param {boolean} expectFile
 * @return {Promise<string>} - fulfils with the validated full path
 * @private
 */
async function _assertPathExists(targetPath, expectFile) {
    if (!targetPath || typeof targetPath !== 'string') {
        throw 'Invalid path';
    }

    let fullPath = path.resolve(targetPath),
        isOk = false;

    try {
        let statForPath = fullPath && await stat(fullPath);
        isOk = statForPath && ((expectFile && statForPath.isFile()) || (!expectFile && statForPath.isDirectory()));
    } catch (err) {
        // not ok
    }
    if (!isOk) {
        throw 'Given path is not a ' + (expectFile ? 'file' : 'directory');
    }
    return fullPath;
}

/**
 * @param filePath
 * @return {Promise<string>} - the file path if exists, otherwise rejects
 */
export function assertFileExists(filePath) {
    return _assertPathExists(filePath, true);
}

/**
 * @param dirPath
 * @return {Promise<string>} - the dir path if exists, otherwise rejects
 */
export function assertDirExists(dirPath) {
    return _assertPathExists(dirPath, false);
}



