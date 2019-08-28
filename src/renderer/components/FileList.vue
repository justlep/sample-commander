<template lang="pug">
    
    div
        ul.file__list(:class="cssListClass", @click="onListClicked", @contextmenu="onListRightclicked", @dragstart="onDragStart", @dragend="onDragEnd", data-rect-select, ref="fileListElem")
            li.file__item(v-for="fileItem in fileItems",
                        draggable=true,
                        :title="fileItem.path"
                        :data-itemid="fileItem.id",
                        :class="{'file__item--playing': playedFileItemId === fileItem.id, 'file__item--selected': _isFileItemSelected(fileItem)}")
                span.file__filename {{ fileItem.filename }}
                a.file__extDrag.fa.fa-external-link-alt(draggable=true, title="Drag to external application or click to show in Explorer", rel="external")
                .file__meta
                    div
                        span.file__size {{ fileItem.formattedFilesize }}
                        | &nbsp;|&nbsp;
                        span.file__duration(v-if="showDuration") {{ fileItem.metadata.duration || '?' }}
                    span.file__mtime(v-if="showMTime") {{ fileItem.formattedMTime }}
                .spectro(v-if="spectrogramSize && fileItem.spectrogram", 
                         :style="{backgroundImage:getSpectrogramCssBgImgUrl(fileItem), height: spectrogramSize + 'px'}")
                    .spectro__progress(v-if="playedFileItem && playedFileItem.id === fileItem.id", :style="{transform: 'translate(' + (seekPercentage - 100) + '%, 0)'}")
                    .spectro__clickzone
        
        //- div RectSelector: {{ JSON.stringify(rectSelector, null, 2) }}
        .file__dragInfo(ref="dragInfoElem") {{ dragInfoText }}
    
</template>

<script>
    import {ipcRenderer} from 'electron'
    import { sync, get, call } from 'vuex-pathify'
    import { 
        KEY_CODES, 
        MAX_SOURCE_ITEM_WIDTH, 
        HOTKEY_SELECT_ALL, 
        HOTKEY_DESELECT_ALL, 
        IPC_SET_EXTERNALLY_DRAGGED_FILES } from '@/constants'
    import ItemCollection from '@/helpers/ItemCollection'
    import {RectSelector, RectSelectableItem} from '@/helpers/RectSelector'
    import { scrollToElement } from '@/helpers/scrollHelper'
    
    const SPECTROGRAM_CLICKZONE_CLASS = 'spectro__clickzone';
    
    export default {
        props: {
            fileItems: Array,
            /** @type {RectSelector} */
            rectSelector: RectSelector
        },
        data: () => ({
            selectionChangeFlag: 0,
            dragInfoText: ''
        }),
        computed: {
            ...get([
                'config/simpleSelect',
                'config/showMTime',
                'config/showDuration',
                'config/showSampleRate',
                'config/sourceItemWidth',
                'player/playedFileItemId',
                'player/playedFileItem'
            ]),
            ...sync([
                'draggedFileItemCollection',
                'spectrogramSize',
                'player/seekPercentage',
                'isMousewheelResizingDisabled'
            ]),
            cssListClass: function(/* state */) {
                let w = this.sourceItemWidth;
                return `file__list--w${w} file__list--w${w === MAX_SOURCE_ITEM_WIDTH ? 'Max' : 'NonMax'}`;
            },
            totalSelected() {
                return this.selectionChangeFlag && Object.keys(this._selectedIdsMap).length;
            },
            canSelectAll() {
                let totalFiles = this.fileItems.length;
                return !!totalFiles && this.totalSelected < totalFiles; 
            },
            canDeselectAll() {
                return !!this.totalSelected;
            },
            selectedIdsMapForRect() {
                let rectSelector = this.rectSelector,
                    newIdsMap = null;
                
                if (rectSelector.status.isActive && rectSelector.hasSelectableItems && rectSelector.hasChanged) {
                    newIdsMap = {};
                    for (let it of rectSelector.selectableItems) {
                        newIdsMap[it.itemId] = it.isSelected;
                    }
                }
                return newIdsMap;
            }
        },
        watch: {
            selectedIdsMapForRect(newSelectedIdsMap) {
                if (newSelectedIdsMap) {
                    this._selectedIdsMap = newSelectedIdsMap;
                    this.selectionChangeFlag++;
                }
            },
            sourceItemWidth() {
                this.focusPlayedFileItem();
            },
            spectrogramSize() {
                this.focusPlayedFileItem();
            },
            'rectSelector.status'(newStatus, oldStatus) {
                if (newStatus === oldStatus) {
                    throw new Error('rectSelector status watcher fired without actual change, wtf');
                }
                let newSelectableItems = null;

                if (newStatus.isActive) {
                    newSelectableItems = Array.from(this.$refs.fileListElem.querySelectorAll('li.file__item')).map(li => {
                        let itemId = li.getAttribute('data-itemid'),
                            wasSelected = this._selectedIdsMap[itemId];

                        return new RectSelectableItem(li, itemId, wasSelected);
                    });
                    
                } else if (newStatus.isCancelled) {
                    // restore selectedIdMap status from before selection started
                    this.$log.dev('selection cancelled -> FileList restoring previous selection');
                    this._selectedIdsMap = this.rectSelector.selectableItems.reduce((idMap, it) => Object.assign(idMap, {[it.itemId]: it.wasSelected}), {});
                    this.selectionChangeFlag++;
                    
                }  else if (newStatus.isDone) {
                    this.$log.dev('selection done -> FileList accepting selection');
                    
                } else {
                    throw new Error('Unexpected rectSelector status: ' + newStatus);
                }
                
                this.rectSelector.setSelectableItems(newSelectableItems);
                // prevent erratic behavior of [Shift]+Click afterwards
                this._lastSelectedItem = null; 
                // prevent Ctrl+Mousewheel conflicts with Ctrl+rect-select 
                this.isMousewheelResizingDisabled = newStatus.isActive;
            }
        },
        methods: {
            ...call([
                'player/setPlayedFileItem'
            ]),
            playNext() {
                let index = this.playedFileItem ? this.fileItems.indexOf(this.playedFileItem) : -1,
                    nextIndex = (index + 1) % (this.fileItems.length || 1),
                    item = this.fileItems[nextIndex];
                this.playFileFromStart(item);
            },
            playPrevious() {
                let index = this.playedFileItem ? this.fileItems.indexOf(this.playedFileItem) : 1,
                    prevIndex = Math.max(0, (index === 0) ? (this.fileItems.length - 1) : index - 1),
                    item = this.fileItems[prevIndex];
                this.playFileFromStart(item);
            },
            playFileFromStart(fileItem, justPlayToggleIfSelected) {
                if (justPlayToggleIfSelected && fileItem.id === this.playedFileItemId) {
                    this.$emitGlobal('player-toggle-play');
                    return;
                }
                this.playFileFromPosition(fileItem, 0);
            },
            playFileFromPosition(fileItem, seekFactor) {
                if (fileItem.id !== this.playedFileItemId) {
                    this.setPlayedFileItem(fileItem);
                }
                this.seekPercentage = (seekFactor * 100) + '%';
                this.$emitGlobal('player-seek-by-factor', {factor: seekFactor, filename: fileItem.filename});
            },
            focusPlayedFileItem(delay = 100) {
                setTimeout(() => {
                    this.$log.dev('Re-focussing played file item');
                    let itemId = this.playedFileItemId,
                        elem = itemId && document.querySelector(`.file__item[data-itemid="${itemId}"]`);

                    scrollToElement({idOrElem: elem, scrollableParentElemOrId: '.mainPanel__scrollable'});
                }, delay);
            },
            /**
             * @param {Element} [optElem]
             * @param {Event} [event]
             * @return {Object} - like {fileItem: <FileItem>, index: Number} 
             * @private
             */
            _findClosestFileItemAndIndex(optElem, event) {
                let elem = optElem || event.target.closest('.file__item'),
                    itemId = elem && elem.getAttribute('data-itemid'),
                    index = itemId && this.fileItems.findIndex(it => it.id === itemId),
                    fileItem = (index >= 0) && this.fileItems[index];
                
                return {fileItem, index};
            },
            _isDragToExternalElement(el) {
                return el && el.matches('a[rel=external]');
            },
            onDragStart(e) {
                let {fileItem} = this._findClosestFileItemAndIndex(null, e);
                if (!fileItem) {
                    return;
                }
                e.stopPropagation();

                if (this._isDragToExternalElement(e.target)) {
                    e.preventDefault();
                    ipcRenderer.send(IPC_SET_EXTERNALLY_DRAGGED_FILES, fileItem.path);
                    return;
                }
                
                let isFileSelected = this._isFileItemSelected(fileItem),
                    draggedItems = isFileSelected ? this._getSelectedFileItems() : [fileItem],
                    totalDragged = draggedItems.length,
                    {dragInfoElem} = this.$refs;
                
                if (!isFileSelected && this.simpleSelect) {
                    // Mimic same behavior as Windows Explorer:
                    //  - if dragged item is not selected -> select it and deselect all others
                    //  - if dragged item is selected -> consider it + all fellow selected items as being dragged
                    this._selectFileItem(fileItem, true, true);
                }
                
                this.dragInfoText = `${totalDragged} ${totalDragged === 1 ? 'file' : 'files'} `;
                e.dataTransfer.setData('text/plain', draggedItems.map(it => it.path).join('\n'));
                e.dataTransfer.setDragImage(dragInfoElem, -20, -10);
                e.dataTransfer.effectAllowed = 'copyLink';
                
                this.draggedFileItemCollection = new ItemCollection(draggedItems);
                
                //this.$log.warn('dragstart %o', fileItem);
            },
            onDragEnd(e) {
                /**
                 * dragend event happens AFTER drop event, so we can safely assume some drop handler has already
                 * made his copy of `draggedFileItemCollection`, and we can safely reset it now
                 * See {@link DirList.methods.onDrop}
                 */
                this.draggedFileItemCollection = null;
                e.preventDefault();
            },
            _isSpectrogramOfItemDisplayed(fileItem) {
                return !!(fileItem.spectrogram && this.spectrogramSize);
            },
            /**
             * @param {Event} e
             */
            onListClicked(e) {
                let {fileItem} = this._findClosestFileItemAndIndex(null, e);
                if (!fileItem) {
                    return;
                }
                
                if (this._isDragToExternalElement(e.target)) {
                    this.$emitGlobal('show-path-in-explorer', fileItem.path);
                    return;
                }
                
                this.selectionChangeFlag = Date.now();
                
                if (e.shiftKey) {
                    this._shiftSelectFileItem(fileItem);
                    return;
                }
                if (e.ctrlKey) {
                    this._toggleSelectFileItem(fileItem);
                    return;
                }
                if (this.simpleSelect) {
                    this._selectFileItem(fileItem);
                }
                if (!fileItem.isAudioFile) {
                    return;
                }
                
                let isSpectrogramClick = e.target.className === SPECTROGRAM_CLICKZONE_CLASS;
                if (isSpectrogramClick) {
                    let offsetX = e.offsetX || 0,
                        {width} = e.target.getBoundingClientRect(),
                        seekFactor = (width > 0) ? (offsetX / width) : 0;

                    this.playFileFromPosition(fileItem, seekFactor);
                } else {
                    let togglePlayIfAlreadySelected = !this._isSpectrogramOfItemDisplayed(fileItem);
                    this.playFileFromStart(fileItem, togglePlayIfAlreadySelected);
                }
            },
            onListRightclicked(e) {
                let {fileItem} = this._findClosestFileItemAndIndex(null, e);
                if (!fileItem) {
                    return;
                }
                
                let isSpectrogramClicked = e.target.className === SPECTROGRAM_CLICKZONE_CLASS;
                
                if (e.ctrlKey) {
                    this._toggleSelectFileItem(fileItem);
                    return;
                }
                if (isSpectrogramClicked && this.isPlayedFileItem(fileItem)) {
                    this.$emitGlobal('player-toggle-play');
                } else {
                    let {canSelectAll, canDeselectAll} = this,
                        selectedFileItems = this._isFileItemSelected(fileItem) ? this._getSelectedFileItems() : undefined;
                    this.$emitGlobal('show-file-contextmenu', {fileItem, canSelectAll, canDeselectAll, selectedFileItems});
                }
            },
            isPlayedFileItem(fileItem) {
                return !!(fileItem && fileItem.id === this.playedFileItemId);
            },
            _selectFileItem(item, rememberLastSelected = true, deselectAll = true) {
                if (deselectAll) {
                    this._deselectAll();
                }
                this._selectedIdsMap[item.id] = 1;
                if (rememberLastSelected) {
                    this._lastSelectedItem = item;
                }
                this.selectionChangeFlag++;
            },
            _shiftSelectFileItem(fileItem) {
                if (!this._lastSelectedItem) {
                    return;
                }
                let indexLast = this.fileItems.indexOf(this._lastSelectedItem),
                    indexClicked = this.fileItems.indexOf(fileItem),
                    startIndex = Math.min(indexLast, indexClicked),
                    endIndex = Math.max(indexLast, indexClicked);

                for (let i = startIndex; i <= endIndex; i++) {
                    this._selectFileItem(this.fileItems[i], false, false)
                }
                this._lastSelectedItem = fileItem;
            },
            _toggleSelectFileItem(fileItem, skipRememberLastSelected) {
                if (this._isFileItemSelected(fileItem)) {
                    this._deselectItem(fileItem);
                } else {
                    this._selectFileItem(fileItem, !skipRememberLastSelected, false);
                }
            },
            _isFileItemSelected(item) {
                return this.selectionChangeFlag && this._selectedIdsMap[item.id];
            },
            _selectAll() {
                this._selectedIdsMap = this.fileItems.reduce((obj, fileItem) => {
                    obj[fileItem.id] = 1;
                    return obj;
                }, {});
                this.selectionChangeFlag++;
                return false;
            },
            _getSelectedFileItems() {
                return (this.fileItems || []).filter(item => !!this._selectedIdsMap[item.id]);
            },
            _deselectAll() {
                this._selectedIdsMap = {};
                this.selectionChangeFlag++;
                return false;
            },
            _deselectItem(item) {
                if (this._selectedIdsMap[item.id]) {
                    delete this._selectedIdsMap[item.id];
                    this.selectionChangeFlag++;
                }
            },
            getSpectrogramCssBgImgUrl(item) {
                let path = item.spectrogram;
                return path ? `url('file:///${path.replace(/[\\]/g, '/').replace(/'/g,'\\\'')}')` : 'none';
            },
            onKeyUp(e) {
                if (e.charCode || e.target.tagName === 'INPUT') {
                    return;
                }
                // TODO maybe check also if any modal is open

                if (e.keyCode === KEY_CODES.ARROW_LEFT) {
                    this.playPrevious();
                    e.preventDefault();
                } else if (e.keyCode === KEY_CODES.ARROW_RIGHT) {
                    this.playNext();
                    e.preventDefault();
                }
            }
        },
        beforeCreate() {
            this._selectedIdsMap = {};
            this._lastSelectedItem = null;
        },
        created() {
            this.$onGlobal('focus-played-file', () => this.focusPlayedFileItem());
            this.$onGlobal('select-all-files', () => this._selectAll());
            this.$onGlobal('deselect-all-files', () => this._deselectAll());
            document.addEventListener('keyup', this.onKeyUp);
            this.$mousetrap.bind(HOTKEY_SELECT_ALL, this._selectAll);
            this.$mousetrap.bind(HOTKEY_DESELECT_ALL, this._deselectAll);
        },
        beforeDestroy() {
            document.removeEventListener('keyup', this.onKeyUp);
            this.$mousetrap.unbind(HOTKEY_SELECT_ALL, this._selectAll);
            this.$mousetrap.unbind(HOTKEY_DESELECT_ALL, this._deselectAll);
        }
    }
    
</script>

<style lang="scss">

    @import '~@/styles/fileList';
    @import '~@/styles/spectro';
    
</style>
