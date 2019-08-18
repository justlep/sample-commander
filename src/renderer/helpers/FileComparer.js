import asserts from './asserts'
import nodeFs from 'fs'
import nodeCrypto from 'crypto'
import nodePath from 'path'

export const TOTAL_MIDDLE_HASH_BYTES = 10 * 1024; // must be round

export const HASH_ALGORITHM = 'sha256';
export const EMPTY_FILE_HASH = '_ZERO';

/** 
 * Map of fileItem.id -> middle-hash
 * @type {Object<string,string>} 
 **/
const middleHashCache = {}; // map of '{fileItem.id}' -> {middleHash}

/**
 * Map of fileItem.id -> full-hash
 * @type {Object<string,string>}
 **/
const fullHashCache = {};   // map of '{fileItem.id}' -> {fullHash}

/**
 * @param {number} fileSize
 * @param {number} totalBytesToHash
 * @returns {{startIndex: number, endIndex: number}} - the start index to read from, and end index (inclusive) 
 */
export function calculateReadIndexesForHashing(fileSize, totalBytesToHash) {
    if (totalBytesToHash % 2) {
        totalBytesToHash++;
    }
    if (!fileSize || !totalBytesToHash) {
        return {startIndex: 0, endIndex: 0};
    }
    let startIndex = Math.max(0, Math.min(Math.floor(fileSize / 2 - totalBytesToHash / 2), fileSize - totalBytesToHash)), 
        endIndex = Math.min(fileSize - 1, startIndex + totalBytesToHash - 1);
    
    return {startIndex, endIndex};
}

/**
 * Calculates the middle- or full hash for a given file item, then passes it to the callback.
 * Middle = hash of the center {@link TOTAL_MIDDLE_HASH_BYTES} bytes of the file
 * Full = hash over the entire file content
 * @param {FileItem} fileItem
 * @param {boolean} useFullHash - if true, the "full hash" is calculated instead of just the middle hash
 * @param {boolean} [noCache] - if true, the old cached value is replaced with a fresh, re-calculated one
 * @return {Promise<string>} - resolves with the calculated (or cached) hash 
 */
function calculateHash({fileItem, useFullHash, noCache}) {
    let filePath = nodePath.resolve(fileItem.path),
        fileSize = fileItem.filesize || 0,
        cacheKey = fileItem.id,
        cache = (useFullHash) ? fullHashCache : middleHashCache;

    if (!noCache && cache[cacheKey]) {
        return Promise.resolve(cache[cacheKey]);
    }

    if (!fileSize) {
        cache[cacheKey] = EMPTY_FILE_HASH;
        return Promise.resolve(cache[cacheKey]);
    }

    return new Promise((resolve, reject) => {
        let hash = nodeCrypto.createHash(HASH_ALGORITHM),
            {startIndex, endIndex} = calculateReadIndexesForHashing(fileSize, useFullHash ? fileSize : TOTAL_MIDDLE_HASH_BYTES),    
            readStream;
        
        try {
            readStream = nodeFs.ReadStream(filePath, {
                start: startIndex,
                end: endIndex 
            });
        } catch (err) {
            return reject(err);
        }
        
        // console.log('Reading offsets %s till %s of %s', streamOpts.start, streamOpts.end, fileItem.filesize);
        
        readStream.on('data', chunk => hash.update(chunk));
        readStream.on('error', err => reject(err));
        readStream.on('end', () => {
            cache[cacheKey] = hash.digest('hex');
            resolve(cache[cacheKey]);
        });
    });
}

/**
 * @param {FileItem} fileItem
 * @param {boolean} [noCache]
 * @return {Promise<string>}
 */
export function calculateMiddleHash({fileItem, noCache}) {
    return calculateHash({fileItem, useFullHash: false, noCache});
}

export function calculateFullHash({fileItem, noCache}) {
    return calculateHash({fileItem, useFullHash: true, noCache});
}

/**
 * Finds duplicate (target) file items for a given list of source FileItems, 
 * adding them to the source FileItems' duplicates.
 * 
 * @param {FileItem[]} sourceItems (Array) of source file items
 * @param {FileItem[]} targetItems (Array) of target file items
 * @param {CancellationToken} cancellationToken
 * @param {boolean} [quickMode=false] - if true, only the middle hash will be used for content comparison,
 *                                      otherwise full file content
 * @return {void} - returns when all files are compared
 */
export async function checkDuplicateFileItems({sourceItems, targetItems, cancellationToken, quickMode = false}) {
    asserts.assertArray(sourceItems, 'invalid sourceItems for checkDuplicateFileItems');
    asserts.assertArray(targetItems, 'invalid targetItems for checkDuplicateFileItems');

    const _hashingFn = quickMode ? calculateMiddleHash : calculateFullHash;

    // console.warn(`Starting file comparer in ${quickMode ? 'QUICK' : 'FULL CONTENT'} mode`);
    
    if (cancellationToken.isCancelled()) {
        return;
    }
    
    if (!sourceItems.length) {
        return;
    }

    // map of targetSize -> [targetItem, ..]
    let targetItemsBySize = targetItems.reduce((size2items, targetItem) => {
        let {filesize} = targetItem,
            sameSizeItems = size2items[filesize] || (size2items[filesize] = []);
        
        sameSizeItems.push(targetItem);
        return size2items;
    }, {}); 

    if (cancellationToken.isCancelled()) {
        return;
    }
    
    for (let sourceItem of sourceItems) {
        sourceItem.resetDuplicates();

        let sameSizeTargetItems = targetItemsBySize[sourceItem.filesize],
            sourceHash;
        
        if (!sameSizeTargetItems) {
            continue;
        }
        
        // TODO add try/catch

        for (let targetItem of sameSizeTargetItems) {
            if (sourceItem.path === targetItem.path) {
                // target file IS the source file 
                continue;
            }
            
            if (!sourceHash) {
                if (cancellationToken.isCancelled()) {
                    return;
                }
                sourceHash = await _hashingFn({fileItem: sourceItem});
            }

            if (cancellationToken.isCancelled()) {
                return;
            }
            
            let targetHash = await _hashingFn({fileItem: targetItem}),
                isIdentical = sourceHash === targetHash;

            if (isIdentical) {
                sourceItem.addDuplicate(targetItem);
            }
        }
    }
}

/**
 * @param {FileItem[]} fileItems
 */
export function flushCacheForFileItems(fileItems) {
    asserts.assertArray(fileItems, 'invalid fileItems for flushCacheForFileItems');
    for (let fileItem of fileItems) {
        delete middleHashCache[fileItem.id];
        delete fullHashCache[fileItem.id];
    }
}
