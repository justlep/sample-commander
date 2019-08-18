import nodePath from 'path'
import {assertDirExists} from '@/helpers/fileHelper'
import readdirp from 'readdirp';
import Logger from '@/helpers/Logger'
import {NON_REACTIVE_PROPS} from '@/constants'

const SEP_REGEX = nodePath.sep === '\\' ? /\\/g : /\//g;

let _dirIds = 1,
    nextId = () => (++_dirIds).toString(36);


export default class DirItem {

    /**
     * @param {string} path
     * @param {number} [limit] - the maximum # of dirs to load (if 0, no limit is used)
     * @param {CancellationToken} cancellationToken - checked frequently during the tree walk. 
     *                                                When isCancelled() is true, tree-walk will be aborted after the currently processed file.
     * @param {boolean} [includeRootPath] - if true, the start path is returned as the first item, followed by its descendants                              
     * @return {Promise<{dirItems: DirItem[], isLimitExceeded: Boolean}>}
     */
    static loadRecursively({path, limit = Number.MAX_SAFE_INTEGER, cancellationToken, includeRootPath = false}) {
        if (isNaN(limit)) {
            return Promise.reject('Invalid limit ' + limit);
        }
        const effectiveLimit = limit || Number.MAX_SAFE_INTEGER;
        return assertDirExists(path).then((validatedRootPath) => new Promise((resolve, reject) => {
            let dirItems = includeRootPath ? [new DirItem(validatedRootPath)] : [],
                stream = readdirp(path, {
                    type: 'directories',
                    depth: Number.MAX_SAFE_INTEGER,
                    // (!) readdirp crashes on *.asar files when used within Electron apps and asar enabled
                    //     because Electron "augments" Node's native fs package to treat .asar files like directories, 
                    //     but it breaks readdirp. 
                    //     
                    //     Possible solutions: 
                    //          (1) set process.noAsar for renderer process => NO, breaks the app 
                    //          (2) exclude .asar via filter => works  
                    directoryFilter: ['!*.asar']  
                }),
                isLimitExceeded = false,
                finishedCallback = () => {
                    DirItem.sortList(dirItems);
                    resolve({dirItems, isLimitExceeded});
                },
                onData = ({fullPath}) => {
                    isLimitExceeded = dirItems.length >= effectiveLimit;
                    if (isLimitExceeded || (cancellationToken && cancellationToken.isCancelled())) {
                        Logger.debug('destroy dir stream (cancelled or limit exceeded)');
                        stream.pause();
                        stream.destroy();
                        return;
                    }
                    dirItems.push(new DirItem(fullPath));
                };

            stream
                .on('data', onData)
                .on('warn', err => Logger.warn(err))
                .on('error', err => {
                    Logger.error(err);
                    reject(err);
                })
                //.on('end', finishedCallback)
                .on('close', () => {
                    Logger.debug('close DirItem stream');
                    finishedCallback();
                })
                .on('end', () => {
                    Logger.debug('end DirItem stream');
                    finishedCallback();
                });
            })
        );
    }

    /**
     * @param {FileItem[]} dirItems
     * @return {FileItem[]} 
     */
    static sortList(dirItems) {
        return dirItems.sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * @param {string} path
     */
    constructor(path) {
        const resolvedPath = nodePath.resolve(path);
        
        this[NON_REACTIVE_PROPS] = {
            path: resolvedPath,
            name: nodePath.basename(resolvedPath),
            depth: path.match(SEP_REGEX).length,
            id: nextId() // TODO is there still a use for this?
        };
    }
    
    get path() { return this[NON_REACTIVE_PROPS].path }
    get name() { return this[NON_REACTIVE_PROPS].name }
    get depth() { return this[NON_REACTIVE_PROPS].depth }
    get id() { return this[NON_REACTIVE_PROPS].id }
}
