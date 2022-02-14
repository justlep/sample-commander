import Store from 'electron-store'
import {make} from 'vuex-pathify'
import Logger from '@/helpers/Logger'
import nodePath from 'path'
import nodeFs from 'fs'
import { 
    MAX_LAST_PERSISTED_PATHS,
    LINEAR_SPECTROGRAM_DIR_INFO_FILE_CONTENT,
    RECOMMENDED_PARALLEL_METADATA_JOBS, 
    RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS } from '@/constants'
import {getCurrentWindow} from '@electron/remote';

const _electronStore = new Store();

const DEFAULT_PATH = process.cwd(); // FIXME app path
const DEFAULT_PROJECT_FILE_PATTERN = '*.hprj';

const DEFAULT_LINEAR_SPECTROGRAM_DIR = nodePath.resolve(_electronStore.path, '../tmp-spx');

const DEFAULT_LINEAR_SPECTROGRAM_DIR_MARKER_FILE = nodePath.resolve(DEFAULT_LINEAR_SPECTROGRAM_DIR, 'readme.txt');
try {
    nodeFs.accessSync(DEFAULT_LINEAR_SPECTROGRAM_DIR, nodeFs.constants.W_OK)
} catch (err) {
    try {
        nodeFs.mkdirSync(DEFAULT_LINEAR_SPECTROGRAM_DIR);
        nodeFs.writeFileSync(DEFAULT_LINEAR_SPECTROGRAM_DIR_MARKER_FILE,
                             LINEAR_SPECTROGRAM_DIR_INFO_FILE_CONTENT + new Date().toLocaleString());
        Logger.debug('Created temporary folder for linear spectrograms: %s', DEFAULT_LINEAR_SPECTROGRAM_DIR);
    } catch (creationError) {
        Logger.error(creationError);
        alert('ERROR: Failed to create temporary folder ' + DEFAULT_LINEAR_SPECTROGRAM_DIR);
        getCurrentWindow().close();
    }
}


const DEFAULT_STATE = {
    sourcePath: DEFAULT_PATH,
    targetPath: DEFAULT_PATH,
    recurseSource: true,
    autoplay: true,
    filePathTooltip: true,
    showFilesize: true,
    showTargetPanel: true,
    showMTime: true,
    showDuration: true,
    showSampleRate: false,
    targetDirLimit: 300,
    sourceFileLimit: 1000,
    canMousewheelCloseSpectrograms: false,
    lastSourcePaths: [],
    lastTargetPaths: [],
    lastRenamePatterns: [],
    projectFilePattern: DEFAULT_PROJECT_FILE_PATTERN,
    editorExecutablePath: '',
    ffmpegExecutablePath: '',
    ffprobeExecutablePath: '',
    fileManagerExecutablePath: '',
    spectrogramHeight: 100,
    spectrogramIntensity: 100,
    spectrogramSourceFileSizeLimitInMb: 600,
    spectrogramSourceFileDurationLimitInMins: 20,
    sourcePanelWidth: '70%',
    sourceItemWidth: 3,
    sourceItemVSpace: 0,
    minMousewheelSourceItemWidth: 1,
    metadataConcurrency: RECOMMENDED_PARALLEL_METADATA_JOBS,
    spectrogramConcurrency: RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS,
    loadInfoOfSmallFilesFirst: false,
    disableSpectrogramsOnDirChange: true,
    favDirs: [],
    duplicateCheckQuickMode: true,
    linearSpectrogramDir: DEFAULT_LINEAR_SPECTROGRAM_DIR,
    doubleClickTargetSetsSource: true
};

const STATE_KEYS = Object.keys(DEFAULT_STATE).sort();

let _isConfigReady = false;

const _isCompatibleKeyValue = (key, val) => key !== undefined && val !== undefined && typeof val === (typeof DEFAULT_STATE[key]);

function _addPathToRecentList(path, arr) {
    if (!_isConfigReady) {
        Logger.warn('Skipping recent path update - config is not ready');
        return;
    }
    if (!path) {
        return;
    }
    let index = arr.indexOf(path);
    
    if (index > 0) {
        arr.splice(index, 1);
        index = -1;
    }
    if (index < 0) {
        arr.unshift(path);
    }
    if (arr.length > MAX_LAST_PERSISTED_PATHS) {
        arr.pop();
    }
    Logger.dev('Updated last paths -> %s', arr.join(','));
}

export default {
    namespaced: true,
    state: DEFAULT_STATE,
    mutations: {
        ...make.mutations(DEFAULT_STATE),
        swapPaths(state) {
            let sourcePath = state.sourcePath;
            state.sourcePath = state.targetPath;
            state.targetPath = sourcePath;
        },
        loadPersistentConfig(state) {
            Logger.dev('Loading persisted config...');
            STATE_KEYS.forEach(key => {
                let savedValue = _electronStore.get(key),
                    isOk = _isCompatibleKeyValue(key, savedValue);
                if (isOk) {
                    state[key] = savedValue;
                }
                Logger.dev('Loading persisted %s : %s', key, isOk ? savedValue : `SKIPPED (${savedValue})`);
            });
            _isConfigReady = true;
        },
        savePersistentConfig(state) {
            Logger.dev('Persisting config...');
            _electronStore.clear();
            STATE_KEYS.forEach(key => {
                let valueToSave = state[key];
                if (_isCompatibleKeyValue(key, valueToSave)) {
                    _electronStore.set(key, valueToSave);
                    Logger.dev('Persisted config: %s=%s', key, valueToSave);
                } else {
                    Logger.warn('Skipped saving config value %s = %s', key, valueToSave);
                }
            });
        },
        addLastSourcePath(state, path) {
            _addPathToRecentList(path, state.lastSourcePaths);
        },
        addLastTargetPath(state, path) {
            _addPathToRecentList(path, state.lastTargetPaths);
        },
        toggleFavDir(state, path) {
            if (!path) {
                return;
            }
            if (state.favDirs.includes(path)) {
                let index = state.favDirs.indexOf(path);
                if (index >= 0) {
                    state.favDirs.splice(index, 1);
                }
            } else {
                state.favDirs.push(path);
            }
        },
        removePathFromList(state, {path, isRecentSource = false, isRecentTarget = false, isFav = false}) {
            if (isRecentSource) {
                state.lastSourcePaths = state.lastSourcePaths.filter(p => p !== path);
            }
            if (isRecentTarget) {
                state.lastTargetPaths = state.lastTargetPaths.filter(p => p !== path);
            }
            if (isFav) {
                state.favDirs = state.favDirs.filter(p => p !== path);
            }
        },
        gotoParentSourceDir(state) {
            state.sourcePath = nodePath.resolve(state.sourcePath, '..');
        },
        gotoParentTargetDir(state) {
            state.targetPath = nodePath.resolve(state.targetPath, '..');
        },
        restoreDefaultLinearSpectrogramDir(state) {
            state.linearSpectrogramDir = DEFAULT_LINEAR_SPECTROGRAM_DIR;
        }
    },
    getters: {
        isFfmpegConfigured: state => !!(state.ffmpegExecutablePath && state.ffprobeExecutablePath),
        isFileManagerTotalCommander: state => (/totalcmd/i).test(state.fileManagerExecutablePath),  
        fileManagerName: (state, getters) =>  getters.isFileManagerTotalCommander ? 'Total Commander' : 'File Manager',
        totalFavDirs: (state) => state.favDirs.length,
        configFilePath: () => _electronStore.path,
        isUsingDefaultLinearSpectrogramDir: (state) => state.linearSpectrogramDir === DEFAULT_LINEAR_SPECTROGRAM_DIR
    }
};
