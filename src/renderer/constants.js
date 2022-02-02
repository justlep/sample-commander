
import nodeOs from 'os'

export const IS_WINDOWS = /^win/.test(process.platform);
export const IS_DEV = process.env.NODE_ENV === 'development';

export const TOTAL_LOGICAL_OR_PHYSICAL_CORES = nodeOs.cpus().length;

export const RECOMMENDED_PARALLEL_METADATA_JOBS = Math.min(6, Math.ceil(TOTAL_LOGICAL_OR_PHYSICAL_CORES / 2) + 1);
export const RECOMMENDED_PARALLEL_SPECTROGRAM_JOBS = Math.min(4, Math.ceil(TOTAL_LOGICAL_OR_PHYSICAL_CORES / 2) - 1);

export const AUDIO_FILE_EXTENSIONS_REGEX = /\.(wav|mp3|ogg|webm|weba|flac)$/i;

/**
 * This is only the URL of the page. 
 * Sample Commander will NEVER download any binaries from anywhere!
 * @type {string}
 */
export const FFMPEG_PAGE_URL = 'https://ffmpeg.org/download.html';

/** thought this is an easy way to hide property maps from VueJS' greedy reactivity */  
export const NON_REACTIVE_PROPS = Symbol('NON_REACTIVE');

export const SYSTEM_FILEMANAGER_NAME = IS_WINDOWS ? 'Explorer' : 'System File Manager';

export const MAX_SOURCE_ITEM_WIDTH = 4;

export const MAX_SPECTROGRAM_SIZE = 512;
export const SPECTROGRAM_SIZE_STEPPING = 64;

export const DUPLICATE_MODE = Object.freeze({
    ALL: {name: 'All', id: 'ALL', isAll: true},
    WITH: {name: 'Duplicates only', id: 'WITH', isWith: true},
    WITHOUT: {name: 'Unique only', id: 'WITHOUT', isWithout: true}
});

export const MAX_LAST_PERSISTED_PATHS = 20;

export const ARROW_SOURCE = '⇐'; 
export const ARROW_TARGET = '⇒'; 
export const ARROW_SELF = '⇑'; 
export const ARROW_SWAP = '⇔'; 

export const GLOBAL_EVENTS = [
    'player-toggle-play',
    'player-should-reset',
    'focus-played-file',
    'player-seek-by-factor',
    'show-file-contextmenu',
    'show-dir-contextmenu',
    'show-custom-dir-contextmenu',
    'show-source-contextmenu',
    'show-target-contextmenu',
    'select-all-files',
    'deselect-all-files',
    'recalculate-duplicates',
    'show-delete-dialog',
    'show-rename-dialog',
    'show-convert-dialog',
    'show-favdirs-dialog',
    'show-recent-source-dirs-dialog',
    'show-recent-target-dirs-dialog',
    'show-create-subdir-dialog',
    'show-custom-dirs-dialog',
    'show-help-dialog',
    'subdir-created',
    'files-moved-or-copied',
    'files-renamed-or-deleted',
    'source-reload-requested',
    'show-ffmpeg-config-dialog',
    'show-editor-config-dialog',
    'show-filemanager-config-dialog',
    'show-config-dialog',
    'show-maxdirs-config-dialog',
    'clear-electron-cache',
    'spectrograms-deleted',
    'close-dialog-requested',
    'go-back',
    'show-path-in-explorer'
];

export const IPC_PREPARE_SHUTDOWN = 'ipc-prepare-shutdown';
export const IPC_SHUTDOWN_PREPARED = 'ipc-shutdown-prepared';
export const IPC_SET_EXTERNALLY_DRAGGED_FILES = 'ipc-set-ext-dragged-files';
export const IPC_GO_BACK_PRESSED = 'ipc-go-back-pressed';

export const HOTKEY_HELP = 'f1';
export const HOTKEY_SELECT_ALL = 'ctrl+a';
export const HOTKEY_DESELECT_ALL = 'ctrl+d';
export const HOTKEY_TOGGLE_PLAY = 'space';
export const HOTKEY_STOP_PLAYER = 'ctrl+space';
export const HOTKEY_CONFIG = 'ctrl+,';
export const HOTKEY_FILTER_FOCUS = 'ctrl+f';
export const HOTKEY_TOGGLE_TARGET_PANEL = 't';

let prettyHotkey = (s) => s.toUpperCase().replace(/(CTRL|ALT|SPACE|CMD|SHIFT)/g, m => `[${m[0]}${m.substr(1).toLowerCase()}]`); 

export const HOTKEY_DESCRIPTIONS = [
    {hotkey: prettyHotkey(HOTKEY_SELECT_ALL), description: 'Select all files (Source panel)'},
    {hotkey: prettyHotkey(HOTKEY_DESELECT_ALL), description: 'Deselect all files (Source panel)'},
    {hotkey: prettyHotkey(HOTKEY_TOGGLE_TARGET_PANEL), description: 'Toggle the Target panel hidden/visible', isToggleTargetPanel: true},
    {hotkey: '[Arrow Left/Right]', description: 'Play previous/next file'},
    {hotkey: prettyHotkey(HOTKEY_TOGGLE_PLAY), description: 'Pause/Unpause playback of the current file'},
    {hotkey: prettyHotkey(HOTKEY_STOP_PLAYER), description: 'Stop playback'},
    {hotkey: prettyHotkey(HOTKEY_CONFIG), description: 'Open the Settings'},
    {hotkey: prettyHotkey(HOTKEY_FILTER_FOCUS), description: 'Focus the Filter text field'},
    {hotkey: '[ESC]', description: 'In dialogs: Close dialog. In Filter textfield: Reset filter'}
];

export const TARGET_TOGGLER_TOOLTIP_PREFIX = `[${HOTKEY_DESCRIPTIONS.find(d => d.isToggleTargetPanel).hotkey}] - `;

export const KEY_CODES = {
    ARROW_LEFT: 37,
    ARROW_RIGHT: 39
};

export const FFMPEG_EXECUTABLE_FILENAME = IS_WINDOWS ? 'ffmpeg.exe' : 'ffmpeg'; 
export const FFPROBE_EXECUTABLE_FILENAME = IS_WINDOWS ? 'ffprobe.exe' : 'ffprobe';

export const CUSTOM_DIRS_MODE_FAVS = 'favs';
export const CUSTOM_DIRS_MODE_RECENT_SOURCE = 'recentSource';
export const CUSTOM_DIRS_MODE_RECENT_TARGET = 'recentTarget';
export const CUSTOM_DIRS_MODE_DEFAULT = 'asPrevious';

export const LINEAR_SPECTROGRAM_DIR_INFO_FILE_CONTENT = `Sample Commander temporary spectrogram folder.\r
Any file of the pattern *.SPX.png in this folder can be safely deleted.\r
Generated: `;

export const REPO_URL = 'https://github.com/justlep/sample-commander';
export const CHANGELOG_URL = 'https://github.com/justlep/sample-commander/blob/master/CHANGELOG.md';
export const RELEASES_URL = 'https://github.com/justlep/sample-commander/releases';
export const CONTACT_EMAIL = 'SAMPLECOMMANDER@JUSTLEP.NET';

export const COPYRIGHT = '© 2015 - 2022 Lennart Pegel';
