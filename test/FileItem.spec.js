import Logger from '@/helpers/Logger'
import FileItem from '@/model/FileItem'
import {CancellationTokenFactory} from '@/processing/CancellationTokenFactory'
import path from 'path'

const TEST_FILES_DIR_PATH = path.join(__dirname, 'test-files');

/**
 * @param {FileItem} fileItem
 */
function fileItemToJson(fileItem) {
    let {filename, filesize, isAudioFile, supportsSpectrograms} = fileItem;
    return {filename, filesize, isAudioFile, supportsSpectrograms};
}

describe('FileItem', () => {

    beforeAll(() => {
        Logger.setLogLevel(Logger.LEVEL.OFF)
    });
    
    it('can scan for audio files recursively (by default)', async () => {
        let {fileItems, isLimitExceeded} = await FileItem.findInPath({path: TEST_FILES_DIR_PATH});

        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(fileItems)).toBe(true);

        let nonAudioFileItem = fileItems.find(it => !it.isAudioFile); 
        expect(nonAudioFileItem).toBeUndefined();
        
        expect(fileItems.find(it => it.filename.includes('-in-subdir.'))).toBeInstanceOf(FileItem);
        
        let itemsJson = fileItems.map(fileItemToJson);
        expect(itemsJson).toMatchSnapshot();
    });


    it('can scan for audio files non-recursively', async () => {
        let {fileItems, isLimitExceeded} = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: false});

        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(fileItems)).toBe(true);
        expect(fileItems.length).toBeGreaterThan(0);

        let nonAudioFileItem = fileItems.find(it => !it.isAudioFile);
        expect(nonAudioFileItem).toBeUndefined();

        expect(fileItems.find(it => it.filename.includes('-in-subdir.'))).toBeUndefined();
        
        let itemsJson = fileItems.map(fileItemToJson);
        expect(itemsJson).toMatchSnapshot();
    });
    
    it('can scan for files with a limit', async () => {
        let {fileItems, isLimitExceeded} = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true});
        
        const LIMIT = 5;
        const totalFilesUnlimited = fileItems.length; 
        expect(totalFilesUnlimited).toBeGreaterThan(LIMIT);
        expect(isLimitExceeded).toBe(false);

        // with limit below actually present files
        let retObj = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true, limit: LIMIT});
        expect(Array.isArray(retObj.fileItems)).toBe(true);
        expect(retObj.fileItems.length).toBe(LIMIT);
        expect(retObj.isLimitExceeded).toBe(true);

        // with limit that matches exactly the # of present files (i.e. limit reached, but not exceeded)
        
        retObj = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true, limit: totalFilesUnlimited});
        expect(Array.isArray(retObj.fileItems)).toBe(true);
        expect(retObj.fileItems.length).toBe(totalFilesUnlimited);
        expect(retObj.isLimitExceeded).toBe(false);
    });
    
    it('can scan for files with a custom filenamePattern (regex)', async () => {
        let retObj = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true, filenamePattern: /\.txt$/});
        expect(Array.isArray(retObj.fileItems)).toBe(true);
        expect(retObj.fileItems.map(fileItemToJson)).toMatchSnapshot();
    });
    
    it ('can be interrupted with scanning by a given CancellationToken', async () => {
        const tokenFactory = new CancellationTokenFactory();
        let cancellationToken = tokenFactory.newToken(),
            retObj = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true, cancellationToken});

        expect(cancellationToken.isCancelled()).toBe(false);
        expect(retObj.fileItems.length).toBeGreaterThan(0);
        expect(cancellationToken.isCancelled()).toBe(false);
        
        let token2 = tokenFactory.newToken();
        expect(cancellationToken.isCancelled()).toBe(true); // old token is invalidated by generating token2
        expect(token2.isCancelled()).toBe(false);
        token2.cancel();
        expect(token2.isCancelled()).toBe(true);
        retObj = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: true, cancellationToken: token2});
        expect(retObj.fileItems.length).toBe(0);
    });
});
