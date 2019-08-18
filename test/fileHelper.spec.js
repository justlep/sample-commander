import {assertFileExists, assertDirExists, pathExists} from '@/helpers/fileHelper'
import path from "path";

const TEST_DIR_PATH = path.normalize(__dirname);
const TEST_FILE_PATH = path.join(TEST_DIR_PATH, 'fileHelper.spec.js');

describe('fileHelper', () => {

    it('can determine if a dir or file path exists', async () => {
        expect(await pathExists(TEST_DIR_PATH)).toBe(true);
        expect(await pathExists(TEST_FILE_PATH)).toBe(true);
        expect(await pathExists(TEST_DIR_PATH + 'xx')).toBe(false);
        expect(await pathExists(TEST_FILE_PATH + 'xx')).toBe(false);
    });
    
    it('can assert that a directory exists', async () => {
        let p;
        try {
            p = await assertDirExists(TEST_DIR_PATH);
        } catch (err) {
            fail('unexpected exception');
        }
        expect(p).toEqual(TEST_DIR_PATH);
        
        // fail on non-existing dir
        try {
            await assertDirExists(path.join(TEST_DIR_PATH, 'foo-bar-nonexistent'));
            fail('expected an exception here');
        } catch (err) {
        }

        // fail on existing path which is not a directory but a file
        try {
            await assertDirExists(TEST_FILE_PATH);
            fail('expected an exception here');
        } catch (err) {
        }
    });
    
    it('can assert that a file exists', async () => {
        let f;
        try {
            f = await assertFileExists(TEST_FILE_PATH);
        } catch (err) {
            fail('unexpected exception');
        }
        expect(f).toEqual(TEST_FILE_PATH);
        
        // fail on non-existent file
        try {
            await assertFileExists(path.join(TEST_FILE_PATH, '../foo-bar-nonexistent.txt'));
            fail('expected an exception here');
        } catch (err) {
        }
        
        // fail on existing path which is not a file but a directory
        try {
            await assertFileExists(TEST_DIR_PATH);
            fail('expected an exception here');
        } catch (err) {
        }
    });
    
});
