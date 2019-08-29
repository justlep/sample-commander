<template lang="pug">
    
    ul.dir__list(@contextmenu="onListRightclicked", @dragover="onDragOver", @dragenter="onDragEnter", @dragleave="onDragLeave", @drop="onDrop")
        li.dir__item(v-for="(dirItem, index) in dirItems", 
                     :data-itemid="dirItem.id", 
                     :class="{'dir__item--selected': indexMarkedSelected === index, 'dir__item--played': indexMarkedPlayed === index}")
        
            a(:style="{paddingLeft: (dirItem.depth - baseDepth) + 'em'}", @dblclick="onDoubleClicked") {{ (index || !isFirstItemRoot) ? dirItem.name : dirItem.path }}

</template>

<script>
    import { get, sync } from 'vuex-pathify'
    import DragDropData from '@/helpers/DragDropData'
    
    export default {
        props: {
            value: String, // the current target path
            dirItems: Array,
            rootDepth: Number,
            isFirstItemRoot: Boolean,
            markPathSelected: String,
            markPathPlayed: String
        },
        computed: {
            ...get([
                'draggedFileItemCollection',
                'config/doubleClickTargetSetsSource'
            ]),
            ...sync([
                'dragDropData',
                'config/sourcePath'
            ]),
            baseDepth() {
                return (this.dirItems[0] || {depth: 0}).depth;  
            },
            indexMarkedSelected() {
                return this.markPathSelected ? this.dirItems.findIndex(dirItem => dirItem.path === this.markPathSelected) : -1;
            },
            indexMarkedPlayed() {
                return this.markPathPlayed ? this.dirItems.findIndex(dirItem => dirItem.path === this.markPathPlayed) : -1;
            }
        },
        methods: {
            onListRightclicked(e) {
                let {dirItem} = this._findClosestDirItemAndIndex(null, e);
                if (dirItem) {
                    this.$emitGlobal('show-dir-contextmenu', {dirItem});
                }
            },
            onDoubleClicked(e) {
                let {dirItem} = this._findClosestDirItemAndIndex(null, e);
                if (dirItem) {
                    if (this.doubleClickTargetSetsSource) {
                        this.sourcePath = dirItem.path;
                    } else {
                        this.$emit('input', dirItem.path);
                    }
                }
            },
            /**
             * @param {Element} [optElem]
             * @param {Event} [event]
             * @return {Object} - like {dirItem: <DirItem>, index: Number}
             * @private
             */
            _findClosestDirItemAndIndex(optElem, event) {
                let elem = optElem || event.target.closest('.dir__item'),
                    itemId = elem && elem.getAttribute('data-itemid'),
                    index = itemId && this.dirItems.findIndex(it => it.id === itemId),
                    dirItem = (index >= 0) && this.dirItems[index];

                return {dirItem, index};
            },
            onDragOver(e) {
                e.preventDefault();
            },
            onDragEnter(e) {
                let {dirItem} = this._findClosestDirItemAndIndex(null, e);
                if (dirItem) {
                    e.target.style.color = '#e3e5e6'; // $dirHoverColor
                }
            },
            onDragLeave(e) {
                let {dirItem} = this._findClosestDirItemAndIndex(null, e);
                if (dirItem) {
                    e.target.style.color = '';
                }
            },
            onDrop(e) {
                let {dirItem} = this._findClosestDirItemAndIndex(null, e);
                if (dirItem && this.draggedFileItemCollection) {
                    e.target.style.color = '';
                    this.dragDropData = new DragDropData(this.draggedFileItemCollection.getItems(), dirItem);
                }
            }
        }
    }
    
</script>

<style lang="scss">

    @import '~@/styles/dirList';

</style>
