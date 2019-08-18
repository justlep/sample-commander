import crypto from 'crypto'
import assert from 'assert'
import fs from 'fs'
import { 
    calculateReadIndexesForHashing, 
    calculateMiddleHash, 
    calculateFullHash,
    checkDuplicateFileItems,
    flushCacheForFileItems,
    TOTAL_MIDDLE_HASH_BYTES } from '@/helpers/FileComparer'
import FileItem from '@/model/FileItem'
import path from 'path'
import {unlink} from '@/helpers/fileHelper'
import {CancellationTokenFactory} from "@/processing/CancellationTokenFactory";

const TEST_WAVE_FILENAME = '20k-sweep-48k.wav';
const TEST_FILES_DIR_PATH = path.join(__dirname, 'test-files');
const GENERATE_FILES_PATH = path.join(__dirname, 'test-files-generated');

async function _deleteGeneratedFiles() {
    let {fileItems} = await FileItem.findInPath({path: GENERATE_FILES_PATH, recursive: false, filenamePattern: /\.txt$/});
    for (let fileItem of fileItems) {
        await unlink(fileItem.path);
    }
}

/**
 * @param {string} filename
 * @param {number} size
 * @return {string} path of the generated file
 * @private
 */
function _generateFileWithRandomContent(filename, size) {
    assert(size %2 === 0); // just for this test
    const randomBytes = crypto.randomBytes(size / 2).toString('hex');
    const filePath = _pathForGeneratedFile(filename);
    fs.writeFileSync(filePath, randomBytes);
    return filePath;
}

function _pathForGeneratedFile(filename) {
    return path.join(GENERATE_FILES_PATH, filename);
}


describe('FileComparer', () => {

    const VALID_TOKEN = new CancellationTokenFactory().newToken(); 
    
    afterAll(async () => {
        await _deleteGeneratedFiles();
    });
    
    it('can determine read positions for full-file hashing', () => {
        let o = calculateReadIndexesForHashing(0, 0);
        expect(o.startIndex).toBe(0);
        expect(o.endIndex).toBe(0);
        
        o = calculateReadIndexesForHashing(1000, 1000);
        expect(o.startIndex).toBe(0);
        expect(o.endIndex).toBe(999);
        
        o = calculateReadIndexesForHashing(900, 1000);
        expect(o.startIndex).toBe(0);
        expect(o.endIndex).toBe(899);
    });

    it('can determine read positions for partial/middle hashing', () => {
        let o = calculateReadIndexesForHashing(1000, 100);
        expect(o.startIndex).toBe(450);
        expect(o.endIndex).toBe(549);

        o = calculateReadIndexesForHashing(999, 10);
        expect(o.startIndex).toBe(494);
        expect(o.endIndex).toBe(503);
        
        o = calculateReadIndexesForHashing(200, 1000);
        expect(o.startIndex).toBe(0);
        expect(o.endIndex).toBe(199);
    });
    
    it('can determine the hash for a wave file', async () => {
        let {fileItems, isLimitExceeded} = await FileItem.findInPath({path: TEST_FILES_DIR_PATH, recursive: false});
        
        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(fileItems)).toBe(true);
        expect(fileItems.length > 0).toBe(true);
        
        let fileItem = fileItems.find(it => it.path.endsWith(TEST_WAVE_FILENAME));
        expect(fileItem).toBeInstanceOf(FileItem);
        
        let middleHash = await calculateMiddleHash({fileItem, noCache: true});
        expect(typeof middleHash).toBe('string');
        expect(middleHash).toMatch(/^[0-9a-f]+$/);
        
        let fullHash = await calculateFullHash({fileItem, noCache: true});
        expect(typeof fullHash).toBe('string');
        expect(fullHash).toMatch(/^[0-9a-f]+$/);
        expect(fullHash).not.toEqual(middleHash);
    });
    
    it('calculates the full hash instead middle one for small files', async () => {
        const smallFilePath = path.join(__dirname, 'test-files/small-file.txt');
        const [fileItem] = await FileItem.getByPaths({paths: [smallFilePath]});
        
        expect(fileItem).toBeInstanceOf(FileItem);
        expect(fileItem.filesize).toBeGreaterThan(0);
        expect(fileItem.filesize).toBeLessThan(TOTAL_MIDDLE_HASH_BYTES);

        let middleHash = await calculateMiddleHash({fileItem, noCache: true});
        expect(typeof middleHash).toBe('string');
        expect(middleHash).toMatch(/^[0-9a-f]+$/);

        let fullHash = await calculateFullHash({fileItem, noCache: true});
        expect(fullHash).toEqual(middleHash);
    });
    
    it('can check check duplicates in QuickMode and non-QuickMode', async () => {
        await _deleteGeneratedFiles();
        
        const size = TOTAL_MIDDLE_HASH_BYTES + 100;
        
        const filePath1 = _generateFileWithRandomContent('1-generated.txt', size);
        const filePath2 = _pathForGeneratedFile('2-generated-copy.txt');
        const filePath3 = _pathForGeneratedFile('3-generated-copy.txt');
        const filePath4 = _generateFileWithRandomContent('4-generated-other.txt', size);
        const filePath5 = _pathForGeneratedFile('5-generated.txt');
        fs.copyFileSync(filePath1, filePath2);
        fs.copyFileSync(filePath1, filePath3);

        let file1BufManipulated = fs.readFileSync(filePath1);
        file1BufManipulated[0] = file1BufManipulated[0] === 66 ? 55: 66; // just change the first byte, so middle hash wont change
        fs.writeFileSync(filePath5, file1BufManipulated);
        
        let fileItems = await FileItem.getByPaths({paths: [filePath1, filePath2, filePath3, filePath4, filePath5]}),
            [fileItem1, fileItem2, fileItem3, fileItem4, fileItem5] = fileItems;
        
        expect(fileItems.every(it => it instanceof FileItem)).toBe(true);
        expect(fileItems.every(it => it.filesize === size)).toBe(true);
        expect(fileItems.every(it => !it.hasDuplicates())).toBe(true);

        flushCacheForFileItems(fileItems);
        
        await checkDuplicateFileItems({sourceItems: [fileItem1], targetItems: fileItems, quickMode: true, cancellationToken: VALID_TOKEN});
        
        expect(fileItem1.hasDuplicates()).toBe(true);
        expect([fileItem2, fileItem3, fileItem4, fileItem5].every(it => !it.hasDuplicates())).toBe(true);
        let duplicatePaths = fileItem1.getDuplicatePathsWithoutSelf();
        expect(duplicatePaths.length).toBe(3);
        expect(duplicatePaths).toContain(fileItem2.path);
        expect(duplicatePaths).toContain(fileItem3.path);
        // fileItem5 content is actually different from fileItem1, but only at byte 0 which is not read in quick mode 
        expect(duplicatePaths).toContain(fileItem5.path);  

        flushCacheForFileItems(fileItems);
        
        fileItems.forEach(it => {
            it.resetDuplicates();
            expect(it.hasDuplicates()).toBe(false);
        });

        // now re-check in NON-quick mode  
        await checkDuplicateFileItems({sourceItems: [fileItem1], targetItems: fileItems, quickMode: false, cancellationToken: VALID_TOKEN});

        expect(fileItem1.hasDuplicates()).toBe(true);
        expect([fileItem2, fileItem3, fileItem4, fileItem5].every(it => !it.hasDuplicates())).toBe(true);
        duplicatePaths = fileItem1.getDuplicatePathsWithoutSelf();
        expect(duplicatePaths.length).toBe(3-1);
        expect(duplicatePaths).toContain(fileItem2.path);
        expect(duplicatePaths).toContain(fileItem3.path);
        // fileItem5 content is actually different from fileItem1, but only at byte 0 which is not read in quick mode 
        expect(duplicatePaths).not.toContain(fileItem5.path);


        flushCacheForFileItems(fileItems);
        // just retrospectively make sure middle-hash of item1 is equal to item5, although item5 has a different byte0
        let middleHash1 = await calculateMiddleHash({fileItem: fileItem1, noCache: true}),
            middleHash5 = await calculateMiddleHash({fileItem: fileItem5, noCache: true});
        
        expect(middleHash1.length).toBeGreaterThan(0);
        expect(middleHash1).toEqual(middleHash5);

        let fullHash1 = await calculateFullHash({fileItem: fileItem1, noCache: true}),
            fullHash5 = await calculateFullHash({fileItem: fileItem5, noCache: true});
        
        expect(fullHash1.length).toBeGreaterThan(0);
        expect(fullHash5.length).toBeGreaterThan(0);
        expect(fullHash1).not.toEqual(fullHash5);
        
        expect(fullHash1).not.toEqual(middleHash1);
        expect(fullHash5).not.toEqual(middleHash5);
    });
});
