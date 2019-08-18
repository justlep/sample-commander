import nodePath from 'path'
import ProcessableItemWrapper from './ProcessableItemWrapper'

const PRIV_SYM = Symbol();

export default class RenamableProcessableItemWrapper extends ProcessableItemWrapper {

    /**
     * @param {FileItem} fileItem
     */
    constructor(fileItem) {
        super(fileItem);

        let oldFilename = fileItem.filename,
            oldExt = nodePath.extname(oldFilename);
        
        this.newFilename = fileItem.filename;
        
        this[PRIV_SYM] = {
            oldFilename,
            oldExt,
            oldBasename: nodePath.basename(oldFilename, oldExt)
        }
    }
    
    get oldBasename() { return this[PRIV_SYM].oldBasename }
    get oldExt() { return this[PRIV_SYM].oldExt }
    get oldFilename() { return this[PRIV_SYM].oldFilename }
    
    canRename() {
        return typeof this.newFilename === 'string' && !!this.newFilename.trim() && this.newFilename !== this.oldFilename;
    }
}
