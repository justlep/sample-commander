import nodeCrypto from 'crypto'
import nodePath from 'path'
import { assertDirExists, stat } from '@/helpers/fileHelper'
import readdirp from 'readdirp'
import {NON_REACTIVE_PROPS, AUDIO_FILE_EXTENSIONS_REGEX} from '@/constants'
import Logger from '@/helpers/Logger'
import asserts from '@/helpers/asserts'

/**
 * Represents non-reactive (audio) file items.
 */
export default class FileItem {
    /**
     * @param {string} audioFilePathOrName - an audio file path or filename
     * @return {string}
     */
    static getSpectrogramPathByAudioFilePath(audioFilePathOrName) {
        return audioFilePathOrName + '.SPX.png';
    }
    
    /**
     * @param {FileItem[]} fileItems
     * @return {FileItem[]}
     */
    static sortList(fileItems) {
        return fileItems.sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * @param {string} path
     * @param {boolean} [recursive=true]
     * @param {RegExp} [filenamePattern] - defaults to {@link AUDIO_FILE_EXTENSIONS_REGEX}
     * @param {number} [limit] - the maximum number of files to load (default = Number.MAX_SAFE_INTEGER}, 0 means no limit
     * @param {CancellationToken} [cancellationToken]
     * @param {FileItem[]} [onlySameSizesAs] - an optional array of file items whose sizes are used to pre-filter
     *                                         the scanned files. I.e. if given, only files contained in the given FileItem array
     *                                         will be returned. (Intended primarily for preparing duplicate checks)
     * @return {Promise<{dirItems: FileItem[], isLimitExceeded: Boolean}>}
     */
    static findInPath({path, filenamePattern = AUDIO_FILE_EXTENSIONS_REGEX, recursive = true, 
                          limit = Number.MAX_SAFE_INTEGER, cancellationToken, onlySameSizesAs}) {
        if (isNaN(limit)) {
            return Promise.reject('Invalid limit ' + limit);
        }
        const effectiveLimit = limit || Number.MAX_SAFE_INTEGER;
        const allowedFileSizesMap = Array.isArray(onlySameSizesAs) ? onlySameSizesAs.reduce((sizeMap, fileItem) => {
            sizeMap[fileItem.filesize] = 1;
            return sizeMap;
        }, {}) : null;
        
        return assertDirExists(path).then(() => new Promise((resolve, reject) => {
                let fileItems = [],
                    isLimitExceeded = false,
                    stream = readdirp(path, {
                        type: 'files',
                        fileFilter: allowedFileSizesMap ?
                            entryInfo => allowedFileSizesMap[entryInfo.stats.size || 0] && filenamePattern.test(entryInfo.basename) :
                            entryInfo => filenamePattern.test(entryInfo.basename),
                        depth: recursive ? Number.MAX_SAFE_INTEGER : 0,
                        alwaysStat: true,
                        /** (!) .asar files break readdirp -> see comment in {@link DirItem#loadRecursively} */ 
                        directoryFilter: ['!*.asar'] 
                    }),
                    finishedCallback = () => {
                        FileItem.sortList(fileItems);
                        resolve({fileItems, isLimitExceeded});
                    },
                    /**
                     * @param {Object} entryInfo - https://github.com/paulmillr/readdirp#entryinfo
                     */
                    onData = entryInfo => {
                        isLimitExceeded = fileItems.length >= effectiveLimit;
                        if (isLimitExceeded || (cancellationToken && cancellationToken.isCancelled())) {
                            Logger.debug('destroy file stream (cancelled or limit exceeded)');
                            stream.pause();
                            stream.destroy();
                            return;
                        }

                        let fileItem = new FileItem({
                            path: entryInfo.fullPath,
                            size: entryInfo.stats.size || 0,
                            mtime: entryInfo.stats.mtime.getTime(),
                            validate: !fileItems.length // validate first item to notice future breaking changes in readdirp
                        });

                        fileItems.push(fileItem);
                    };

            stream
                .on('data', onData)
                .on('warn', err => Logger.warn(err))
                .on('error', err => reject(err)) 
                //.on('end', finishedCallback)
                .on('close', () => {
                    Logger.debug('close FileItem stream');
                    finishedCallback();
                })
                .on('end', () => {
                    Logger.debug('end FileItem stream');
                    finishedCallback();
                });
            })
        );
    }

    /**
     * @param {string[]} paths
     * @returns {Promise<FileItem[]>}
     */
    static async getByPaths({paths}) {
        let fileItems = [];
        for (let filePath of paths) {
            try {
                let fileStat = await stat(filePath);
                if (fileStat.isFile()) {
                    fileItems.push(new FileItem({
                        path: filePath,
                        size: fileStat.size,
                        mtime: fileStat.mtime
                    }));
                }
            } catch (err) {
                Logger.dev('Ignoring missing file: %s', filePath);
            }
        }
        return fileItems;
    }
    
    /**
     * @param {string} path
     * @param {number} size
     * @param {number} mtime
     * @param {boolean} [validate] - set true to validate parameters and throw an error if invalid 
     */
    constructor({path, size = 0, mtime, validate}) {
        let resolvedPath = nodePath.resolve(path),
            idHash = nodeCrypto.createHash('sha1'),
            isAudioFile = AUDIO_FILE_EXTENSIONS_REGEX.test(resolvedPath),
            supportsSpectrograms = isAudioFile;

        if (validate) {
            asserts.assertNonEmptyString(path);
            asserts.assertNumberInRange(size, 0, Number.MAX_SAFE_INTEGER);
            asserts.assertNumberInRange(mtime, 0, Number.MAX_SAFE_INTEGER);
            // Logger.debug(path, size, mtime);
        }
        
        idHash.update(resolvedPath + '::' + size + '::' + mtime + '::');
        
        this[NON_REACTIVE_PROPS] = {
            id: idHash.digest('hex'),
            filename: nodePath.basename(resolvedPath),
            path: resolvedPath,
            parentDir: nodePath.join(resolvedPath, '..'),
            filesize: size,
            formattedMTime: new Date(mtime).toLocaleString(), // moment(mtime).format('DD.MM.YYYY - hh:mm:ss (ddd)'),
            formattedFilesize: (size / (1024 * 1024)).toFixed(1),
            isAudioFile,
            supportsSpectrograms,
            isDeleted: false,
            renamedIntoPath: null
        };
        
        this.metadata = {
            duration: '',
            sampleRate: ''
        };
        this.spectrogram = null;
        
        /** @type {String[]} */
        this._duplicatePaths = null;
    }
    
    get id() { return this[NON_REACTIVE_PROPS].id }
    get isAudioFile() { return this[NON_REACTIVE_PROPS].isAudioFile }
    get filename() { return this[NON_REACTIVE_PROPS].filename }
    get path() { return this[NON_REACTIVE_PROPS].path }
    get parentDir() { return this[NON_REACTIVE_PROPS].parentDir }
    get filesize() { return this[NON_REACTIVE_PROPS].filesize }
    get formattedMTime() { return this[NON_REACTIVE_PROPS].formattedMTime }
    get formattedFilesize() { return this[NON_REACTIVE_PROPS].formattedFilesize }
    get supportsSpectrograms() { return this[NON_REACTIVE_PROPS].supportsSpectrograms }
    
    get isDeleted() { return this[NON_REACTIVE_PROPS].isDeleted }
    get renamedIntoPath() { return this[NON_REACTIVE_PROPS].renamedIntoPath }

    hasMetadata() {
        return !!(this.metadata.duration || this.metadata.sampleRate);
    }

    /**
     * @returns {number|null} - the file's Nyquist frequency or null if the `metadata.sampleRate` isn't set 
     */
    getNyquistFrequency() {
        let sampleRate = this.metadata.sampleRate;
        return isNaN(sampleRate) ? null : sampleRate / 2;
    }
    
    /**
     * Returns all registered duplicate paths, but excluding its own path.
     * @return {String[]}
     */
    getDuplicatePathsWithoutSelf() {
        return (this._duplicatePaths || []).filter(path => path !== this.path);
    }
    
    /**
     * @param {FileItem} fileItem
     */
    addDuplicate(fileItem) {
        if (this._duplicatePaths) {
            this._duplicatePaths.push(fileItem.path);
        } else {
            this._duplicatePaths = [fileItem.path];
        }
    }
    
    resetDuplicates() {
        this._duplicatePaths = null;
    }
    
    /** @type {boolean} */
    hasDuplicates() {
        return !!(this._duplicatePaths && this._duplicatePaths.length);
    }
    
    /** @type {boolean} */
    isUnique() {
        return !this._duplicatePaths || !this._duplicatePaths.length;
    }

    /**
     * @return {string}
     */
    getSpectrogramFilename() {
        return FileItem.getSpectrogramPathByAudioFilePath(this.filename);
    }
    
    /**
     * @return {string}
     */
    getSpectrogramPath() {
        return FileItem.getSpectrogramPathByAudioFilePath(this.path);
    }

    setDeleted() {
        this[NON_REACTIVE_PROPS].isDeleted = true;
    }

    /**
     * Marks this file item to be renamed, so it can be cleaned up and re-looked-up.
     * @param {string} newPath
     */
    setRenamed(newPath) {
        this[NON_REACTIVE_PROPS].renamedIntoPath = newPath;
    }
    
    /**
     * @override
     */
    toString() {
        return 'FileItem['+ this.id +']';
    }
}


/**
 * @typedef {Object} Readdirp_EntryInfo
 * @property {string} parentDir - directory in which entry was found (relative to given root)
 * @property {string} fullParentDir - full path to parent directory
 * @property {string} name - name of the file/directory
 * @property {string} path - path to the file/directory (relative to given root)
 * @property {string} fullPath - full path to the file/directory found
 * @property {Object} stat - built in stat object
 */
