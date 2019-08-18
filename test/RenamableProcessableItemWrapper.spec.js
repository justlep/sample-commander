import RenamableProcessableItemWrapper from '@/helpers/RenamableProcessableItemWrapper'
import FileItem from '@/model/FileItem'
import path from 'path'

const OLD_FILENAME = 'small-file.txt';
const OLD_BASENAME = 'small-file';
const OLD_EXT = '.txt';
const NEW_FILENAME = 'small-file-changed.txt';
const TEST_FILE_PATH = path.join(__dirname, 'test-files/', OLD_FILENAME);

describe('RenamableProcessableItemWrapper', () => {

    const ERROR = {};
    let fileItem;

    beforeAll(async () => {
        fileItem = (await FileItem.getByPaths({paths: [TEST_FILE_PATH]}))[0];
    });
    
    it('holds an item and has a mutable state', () => {
        let wrapper = new RenamableProcessableItemWrapper(fileItem);

        expect(wrapper.item).toBe(fileItem);
        expect(wrapper.isPending).toBe(true);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBeFalsy();

        wrapper.setProcessing();
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(true);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBeFalsy();

        wrapper.setProcessed();
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(true);
        expect(wrapper.error).toBeFalsy();

        wrapper.error = ERROR;
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBe(ERROR);

        expect(wrapper.item).toBe(fileItem); // unchanged
    });

    it('can only change pending/processing/processed state via setters', () => {
        let wrapper = new RenamableProcessableItemWrapper(fileItem);
        expect(wrapper.isProcessed).toBe(false);
        expect(() => wrapper.isPending = true).toThrow();
        expect(() => wrapper.isProcessing = true).toThrow();
        expect(() => wrapper.isProcessed = true).toThrow();
    });

    it('provides a unique checkboxId per wrapper for selecting/deselecting', () => {
        let wrapper1 = new RenamableProcessableItemWrapper(fileItem),
            wrapper2 = new RenamableProcessableItemWrapper(fileItem);

        expect(typeof wrapper1.checkboxId).toBe('string');
        expect(typeof wrapper2.checkboxId).toBe('string');
        expect(wrapper1.checkboxId).toBeTruthy();
        expect(wrapper2.checkboxId).toBeTruthy();
        expect(wrapper1.checkboxId).not.toEqual(wrapper2.checkboxId);
    });
    
    it('takes a FileItem and checks if it can be renamed to a newFilename', async () => {
        expect(fileItem).toBeInstanceOf(FileItem);
        expect(fileItem.filename).toBe(OLD_FILENAME);
        let wrapper = new RenamableProcessableItemWrapper(fileItem);
        
        // readonly properties
        expect(wrapper.oldFilename).toBe(OLD_FILENAME);
        expect(() => wrapper.oldFilename = 'foo').toThrow();
        expect(wrapper.oldBasename).toBe(OLD_BASENAME);
        expect(() => wrapper.oldBasename = 'foo').toThrow();
        expect(wrapper.oldExt).toBe(OLD_EXT);
        expect(() => wrapper.oldExt = 'foo').toThrow();
        expect(wrapper.newFilename).toBe(OLD_FILENAME);
        
        expect(wrapper.canRename()).toBe(false);
        expect(() => wrapper.newFilename = NEW_FILENAME).not.toThrow(); // newFilename is a mutable property!
        expect(wrapper.canRename()).toBe(true);
        wrapper.newFilename = '';
        expect(wrapper.canRename()).toBe(false);
        wrapper.newFilename = ' ';
        expect(wrapper.canRename()).toBe(false);
        wrapper.newFilename = ' a ';
        expect(wrapper.canRename()).toBe(true);
        wrapper.newFilename = OLD_FILENAME;
        expect(wrapper.canRename()).toBe(false);
    });
    
});
