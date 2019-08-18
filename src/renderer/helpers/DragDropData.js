const SYM = Symbol();

/**
 * Represents a container for dragged fileItems and a drop-target dirItem,
 * i.e. everything required for some copy/move dialog.
 */
export default class DragDropData {
    /**
     * @param {FileItem[]} droppedFileItems
     * @param {DirItem} targetDirItem
     */
    constructor(droppedFileItems, targetDirItem) {
        this[SYM] = {
            fileItems: droppedFileItems || [],
            targetDirItem: targetDirItem
        };
    }
    /** @returns {FileItem[]} */
    getFileItems() {
        return this[SYM].fileItems;
    }
    /** @returns {DirItem} */
    getTargetDirItem() {
        return this[SYM].targetDirItem;
    }
}
