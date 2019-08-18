import {getMetadataForFileItem} from '@/processing/metadataProcessor'
import FileItem from '@/model/FileItem'
import {assertFileIsExecutable} from '@/helpers/fileHelper'
import path from 'path'

const TEST_FILES_DIR_PATH = path.join(__dirname, 'test-files');

const FFPROBE_EXECUTABLE_PATH = path.resolve('c:\\progs\\ffmpeg-4.1.1-win64-static\\bin\\ffprobe.exe');

describe('metadataProcessor', () => {
   
    xit('can determine metadata for audio fileItems using ffprobe.exe', async () => {
        await assertFileIsExecutable(FFPROBE_EXECUTABLE_PATH);
        
        let {fileItems, isLimitExceeded} = await FileItem.findInPath({path: TEST_FILES_DIR_PATH});
        expect(fileItems.length).toBeGreaterThan(0);
        
        let allMetadata = [];
        
        for (let fileItem of fileItems) {
            expect(fileItem.hasMetadata()).toBe(false);
            let metadata = await getMetadataForFileItem(fileItem, FFPROBE_EXECUTABLE_PATH);
            
            fileItem.metadata = metadata;
            expect(fileItem.hasMetadata()).toBe(true);
            
            allMetadata.push({
                filename: fileItem.filename,
                size: fileItem.filesize,
                nyquistFrequency: fileItem.getNyquistFrequency(),
                metadata
            });
        }
        
        expect(allMetadata).toMatchSnapshot();
    });
    
});
