import {EventEmitter} from 'events'
import Logger from '@/helpers/Logger'
import {priorityQueue, memoize, asyncify} from 'async'
import {getSpectrogramForFileItem} from './spectrogramProcessor'
import {getMetadataForFileItem} from './metadataProcessor'

const DEFAULT_CONCURRENCY = 1;

const STATUS_MAP_SYMBOL = Symbol('PROCESSING_STATUS_BY_FILE_ITEM_ID');

const STATUS_QUEUED = 1;
const STATUS_PROCESSING = 2;
const STATUS_ERROR = 4;

export const EVENT_UNFINISHED_METADATA_COUNT = 'unfinished-metadata-count';
export const EVENT_UNFINISHED_SPECTROGRAM_COUNT = 'unfinished-spectrogram-count';

let _instance;


/**
 * @param {AsyncFunction} asyncFileItemProcessingFn - an `AsyncFunction` in terminology of the async library, NOT an ES2017 async function. 
 *                        e.g. function(fileItem, callback) { .. callback(null, processedData); }
 * @param {function} onProcessedDataReceived, e.g. function(processedData){..}
 * @return {QueueObject}
 * @private
 */
function _createFileItemQueue(asyncFileItemProcessingFn, onProcessedDataReceived) {
    let queue = priorityQueue(function(fileItem, callback) {
        _setFileItemQueueStatus(fileItem, queue, STATUS_PROCESSING);
        asyncFileItemProcessingFn(fileItem, function(err, processedData) {
            _setFileItemQueueStatus(fileItem, queue, null);
            if (err) {
                return callback(err);
            }
            onProcessedDataReceived(fileItem, processedData);
            callback(null, processedData);
        });
    }, DEFAULT_CONCURRENCY);

    queue[STATUS_MAP_SYMBOL] = {};
    queue.error = ((err, fileItem) => {
        Logger.warn('Error while processing %s: %s', fileItem.toString(), err);
        _setFileItemQueueStatus(fileItem, queue, STATUS_ERROR);
    });

    return queue;
}

/**
 * @param {QueueObject} queue
 * @param {number} concurrency
 */
function _setQueueConcurrency(queue, concurrency) {
    queue.concurrency = concurrency;
    queue.buffer = Math.max(0, concurrency - 1);
    if (!queue.paused) {
        // TODO not sure if changing the concurrency really requires pause/resume, doesnt hurt though. check later.
        queue.pause();
        queue.resume();
    }
}

/**
 * @param {FileItem} fileItem
 * @param {QueueObject} queue
 * @returns {number} - one of the STATUS_* constants
 * @private
 */
function _getFileItemQueueStatus(fileItem, queue) {
    return queue[STATUS_MAP_SYMBOL][fileItem.id];
}

/**
 * @param {FileItem} fileItem
 * @param {QueueObject} queue
 * @param {number|null} status
 * @private
 */
function _setFileItemQueueStatus(fileItem, queue, status) {
    if (!status) {
        delete queue[STATUS_MAP_SYMBOL][fileItem.id];
    } else {
        queue[STATUS_MAP_SYMBOL][fileItem.id] = status;
    }
}

function _clearAllFileItemQueueStatus(queue) {
    queue[STATUS_MAP_SYMBOL] = {};
}


function _flushQueue(queue) {
    queue.remove(() => true);
    if (queue.idle()) {
        _clearAllFileItemQueueStatus(queue);
    }
}

/**
 * @param {FileItem} fileItem
 * @param {string} duration
 * @param {number} durationInMins
 * @param {number} sampleRate
 */
function _applyMetadataProcessorResultToFileItem(fileItem, {duration, durationInMins, sampleRate}) {
    fileItem.metadata.duration = duration;
    fileItem.metadata.sampleRate = sampleRate;
    fileItem.metadata.durationInMins = durationInMins;
}

/**
 * @param {FileItem} fileItem
 * @param {string} spectrogramPath
 */
function _applySpectrogramProcessorResultToFileItem(fileItem, spectrogramPath) {
    fileItem.spectrogram = spectrogramPath;
}

/**
 * @param {FileItem} fileItem
 * @param {Object<string, *>} idBasedCache
 * @param {function} applyFn - one of the _apply*ToFileItem() methods above
 * @return {boolean} - true if a cached value was found & applied
 */
function _applyCachedProcessorResultIfExists(fileItem, idBasedCache, applyFn) {
    let cacheEntry = idBasedCache[fileItem.id],
        cachedProcessorResult = cacheEntry && cacheEntry[1],
        isApplicable = !!cachedProcessorResult;

    if (isApplicable) {
        applyFn(fileItem, cachedProcessorResult);
    }
    return isApplicable;
}

/**
 * Represent a processing managing two queues for FFmpeg-based gathering of information for lists of 
 */
export class FileInfoProcessingQueue extends EventEmitter {
    
    /** 
     * @return {FileInfoProcessingQueue} 
     */
    static getInstance() {
        return _instance || (_instance = new FileInfoProcessingQueue());
    }

    /**
     * @param {string} [ffmpegExecutablePath]
     * @param {string} [ffprobeExecutablePath]
     * @param {string} [linearSpectrogramDir]
     * @param {number} [metadataConcurrency]
     * @param {number} [spectrogramConcurrency]
     * @param {boolean} [smallFilesFirst]
     * @param {number} [spectrogramSourceFileSizeLimitInMb]
     * @param {number} [spectrogramSourceFileDurationLimitInMins]
     * @returns {FileInfoProcessingQueue}
     */
    configure({ffmpegExecutablePath, ffprobeExecutablePath, linearSpectrogramDir, metadataConcurrency, spectrogramConcurrency, 
                  smallFilesFirst, spectrogramSourceFileSizeLimitInMb, spectrogramSourceFileDurationLimitInMins}) {
        const logPattern = '[FileInfoProcessingQueue] setting %s = %s';
        if (ffmpegExecutablePath) {
            Logger.dev(logPattern, 'ffmpegExecutablePath', ffmpegExecutablePath);
            this._ffmpegExecutablePath = ffmpegExecutablePath;
        }
        if (ffprobeExecutablePath) {
            Logger.dev(logPattern, 'ffprobeExecutablePath', ffprobeExecutablePath);
            this._ffprobeExecutablePath = ffprobeExecutablePath;   
        }
        if (linearSpectrogramDir) {
            Logger.dev(logPattern, 'linearSpectrogramDir', linearSpectrogramDir);
            this._linearSpectrogramDir = linearSpectrogramDir;   
        }
        if (metadataConcurrency && typeof metadataConcurrency === 'number') {
            Logger.dev(logPattern, 'metadataConcurrency', metadataConcurrency);
            _setQueueConcurrency(this._metadataQueue, metadataConcurrency);
        }
        if (spectrogramConcurrency && typeof spectrogramConcurrency === 'number') {
            Logger.dev(logPattern, 'spectrogramConcurrency', spectrogramConcurrency);
            _setQueueConcurrency(this._spectrogramQueue, spectrogramConcurrency);
        }
        if (typeof smallFilesFirst === 'boolean') {
            Logger.dev(logPattern, 'smallFilesFirst', smallFilesFirst);
            this._smallFilesFirst = smallFilesFirst;
        }
        if (typeof spectrogramSourceFileSizeLimitInMb === 'number') {
            Logger.dev(logPattern, 'spectrogramSourceFileSizeLimitInMb', spectrogramSourceFileSizeLimitInMb);
            this._spectrogramSourceFileSizeLimitInBytes = (spectrogramSourceFileSizeLimitInMb * 1024 * 1024) || Number.MAX_SAFE_INTEGER;
        }
        if (typeof spectrogramSourceFileDurationLimitInMins === 'number') {
            Logger.dev(logPattern, 'spectrogramSourceFileDurationLimitInMins', spectrogramSourceFileDurationLimitInMins);
            this._spectrogramSourceFileDurationLimitInMins = spectrogramSourceFileDurationLimitInMins || Number.MAX_SAFE_INTEGER;
        }
        return this;
    }
    
    flushAllQueues() {
        [this._spectrogramQueue, this._metadataQueue].forEach(queue => {
            _flushQueue(queue);
            queue.resume();
        });
    }

    /**
     * @param {QueueObject} queue
     * @param {string} eventName - the event to be emitted with the # of the queue's unfinished jobs (only emitting upon changes)
     * @returns {function(): boolean} - always returns true 
     * @private
     */
    _createUnfinishedJobsEventEmittingFn(queue, eventName) {
        let prevCount = 0;
        return () => {
            let countNow = queue.length() + queue.running();
            if (countNow !== prevCount) {
                prevCount = countNow;
                this.emit(eventName, countNow);
            }
            return true;
        }
    }

    constructor() {
        super();
        if (_instance) {
            throw new Error('Use FileInfoProcessor.getInstance()');
        }

        /** @type {string|null} */
        this._ffmpegExecutablePath = '';
        /** @type {string|null} */
        this._ffprobeExecutablePath = '';

        /** @type {string} */
        this._linearSpectrogramDir = '';
        
        this._smallFilesFirst = true;
        
        /** @type {number} */
        this._spectrogramSourceFileSizeLimitInBytes = Number.MAX_SAFE_INTEGER;
        
        /** @type {number} */
        this._spectrogramSourceFileDurationLimitInMins = Number.MAX_SAFE_INTEGER;
        
        const self = this;
        
        const cachingMetadataWorkerFn = memoize(
            asyncify(fileItem => getMetadataForFileItem(fileItem, self._ffprobeExecutablePath)),
            fileItem => fileItem.id
        );
        
        const cachingSpectrogramWorkerFn = memoize(
            asyncify(fileItem => getSpectrogramForFileItem(fileItem, self._ffmpegExecutablePath, self._linearSpectrogramDir)),
            fileItem => fileItem.id
        );
        
        this._metadataQueue = _createFileItemQueue(cachingMetadataWorkerFn, _applyMetadataProcessorResultToFileItem);
        
        this._spectrogramQueue = _createFileItemQueue(cachingSpectrogramWorkerFn, _applySpectrogramProcessorResultToFileItem);

        /** @type {Object<string, {duration: string, sampleRate: number, durationInMins: number}>} */
        this._cachedMetadataByFileItemId = cachingMetadataWorkerFn.memo;
        /** @type {Object<string, string>} */    
        this._cachedSpectrogramByFileItemId = cachingSpectrogramWorkerFn.memo;

        const _emitUnfinishedMetadata = this._createUnfinishedJobsEventEmittingFn(this._metadataQueue, EVENT_UNFINISHED_METADATA_COUNT);
        const _emitUnfinishedSpectrograms = this._createUnfinishedJobsEventEmittingFn(this._spectrogramQueue, EVENT_UNFINISHED_SPECTROGRAM_COUNT);
        
        const _toggleSpectroQueueWhileMetadataProcessing = () => {
            let isMetaIdle = this._metadataQueue.idle(),
                isSpectroPaused = this._spectrogramQueue.paused;    
            
            if (isMetaIdle && isSpectroPaused) {
                Logger.dev('Unpausing spectrogram queue');
                this._spectrogramQueue.resume();
            } else if (!isMetaIdle && !isSpectroPaused) {
                Logger.dev('Pausing spectrogram queue');
                this._spectrogramQueue.pause();
            }
        };
        
        // metadata queue status changes...
        
        this._metadataQueue.saturated = () => _emitUnfinishedMetadata() && _toggleSpectroQueueWhileMetadataProcessing(); 
        this._metadataQueue.unsaturated = () => _emitUnfinishedMetadata() && _toggleSpectroQueueWhileMetadataProcessing();
        this._metadataQueue.empty = () => {
            Logger.dev('Metadata task queue is empty');
            _toggleSpectroQueueWhileMetadataProcessing();
            _emitUnfinishedMetadata();
        };
        this._metadataQueue.drain = () => {
            Logger.dev('Metadata task queue is drained, cache: %o', this._cachedMetadataByFileItemId);
            this._spectrogramQueue.resume();
            _emitUnfinishedMetadata();
            _clearAllFileItemQueueStatus(this._metadataQueue);
        };

        // spectrogram queue status changes...
        
        this._spectrogramQueue.saturated = _emitUnfinishedSpectrograms;
        this._spectrogramQueue.unsaturated = _emitUnfinishedSpectrograms;
        this._spectrogramQueue.empty = () => {
            Logger.dev('Spectrogram task queue is empty');
            _emitUnfinishedSpectrograms();
        };
        this._spectrogramQueue.drain = () => {
            _emitUnfinishedSpectrograms();
            _clearAllFileItemQueueStatus(this._spectrogramQueue);
            Logger.dev('Spectrogram task queue is drained, cache: %o', this._cachedSpectrogramByFileItemId);
        };

        
        // TODO persist/re-import queues' cache data
    }
    
    /**
     * @param {FileItem} fileItem
     * @param {QueueObject} queue
     * @private
     */
    _scheduleProcessing(fileItem, queue) {
        let purpose = queue === this._metadataQueue ? 'metadata' : 'spectrogram';
        if (!_getFileItemQueueStatus(fileItem, queue)) {
            Logger.dev('Scheduling %s processing of %s', purpose, fileItem.path);
            let priority = this._smallFilesFirst ? fileItem.filesize : 1;
            _setFileItemQueueStatus(fileItem, queue, STATUS_QUEUED);
            queue.push(fileItem, priority);
        } else {
            Logger.dev('Skipped re-scheduling %s processing of %s', purpose, fileItem.path);
        }
    }

    get metadataConcurrency() { return this._metadataQueue.concurrency }
    get spectrogramConcurrency() { return this._spectrogramQueue.concurrency }

    /**
     * Schedules the metadata processing for the given file item if it's not already loaded or scheduled
     * @param {FileItem} fileItem
     */
    scheduleMetadataProcessing(fileItem) {
        if (!fileItem.hasMetadata()) {
            if (_applyCachedProcessorResultIfExists(fileItem, this._cachedMetadataByFileItemId, _applyMetadataProcessorResultToFileItem)) {
                Logger.dev('Used cached value for metadata of %s', fileItem.path);
                return;
            }
            this._scheduleProcessing(fileItem, this._metadataQueue);
        } else {
            Logger.dev('Skipped scheduling %s for metadata processing', fileItem);
        }
    }

    /**
     * Schedules the spectrogram processing for the given file item if it's not already loaded or scheduled
     * @param {FileItem} fileItem
     */
    scheduleSpectrogramProcessing(fileItem) {
        if (!fileItem.supportsSpectrograms) {
            return;
        }
        if (!fileItem.spectrogram) {
            if (_applyCachedProcessorResultIfExists(fileItem, this._cachedSpectrogramByFileItemId, _applySpectrogramProcessorResultToFileItem)) {
                Logger.dev('Used cached value for spectrogram of %s', fileItem.path);
                return;
            }
            if (fileItem.filesize > this._spectrogramSourceFileSizeLimitInBytes) {
                Logger.dev('Skipped scheduling too big %s for spectrogram processing', fileItem);
                return;
            }
            if ((fileItem.metadata.durationInMins || 0) > this._spectrogramSourceFileDurationLimitInMins) {
                Logger.dev('Skipped scheduling too long %s for spectrogram processing', fileItem);
                return;
            }
            if (fileItem.metadata.sampleRate === undefined) {
                this.scheduleMetadataProcessing(fileItem);
            }
            this._scheduleProcessing(fileItem, this._spectrogramQueue);
        } else {
            Logger.dev('Skipped scheduling %s for spectrogram processing', fileItem);
        }
    }

    /**
     * Removes the cached metadata & spectrogram from the cache (if any).
     * @param {FileItem|string} fileItemOrId
     */
    flushCachesForFileItem(fileItemOrId) {
        let id = (typeof fileItemOrId === 'string') ? fileItemOrId : fileItemOrId.id; 
        delete this._cachedMetadataByFileItemId[id];
        this.flushSpectrogramCacheForFileItem(id);
    }

    /**
     * Flush the spectrogram path cache for a given file item
     * @param {FileItem|string} fileItemOrId
     */
    flushSpectrogramCacheForFileItem(fileItemOrId) {
        let id = (typeof fileItemOrId === 'string') ? fileItemOrId : fileItemOrId.id;
        Logger.warn('Clearing spectrogram cache for ' + fileItemOrId);
        delete this._cachedSpectrogramByFileItemId[id];
    }
    
    flushAllCaches() {
        Object.keys(this._cachedMetadataByFileItemId).forEach(key => delete this._cachedMetadataByFileItemId[key]);
        Object.keys(this._cachedSpectrogramByFileItemId).forEach(key => delete this._cachedSpectrogramByFileItemId[key]);
        Logger.warn('Flushed all processing caches');
    }
}
