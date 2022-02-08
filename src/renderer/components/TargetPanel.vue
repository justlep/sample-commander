<template lang="pug">
    
    .mainPanel
        .mainPanel__header
            a.mainPanel__button.icon--redo(role="button", @click.stop="reload")
            .mainPanel__path(@click="selectTargetPath", @contextmenu="$emitGlobal('show-target-contextmenu')")
                FavDirIcon(:path="targetPath")
                | {{ targetPath }}
            a.mainPanel__button.icon--close(role="button", @click.stop="showTargetPanel = false", :title="TOGGLER_TOOLTIP")
        .mainPanel__content
            .mainPanel__scrollable.mainPanel__scrollable--target
                .mainPanel__message(v-if="error"): b-tag(type="is-danger", closable, attached, @close="error = ''") {{ error }}
                .mainPanel__message(v-if="isTargetDirLimitedExceeded")
                    b-tag(type="is-danger", closable, attached, @close="isTargetDirLimitedExceeded = false") 
                        a(role="button", @click="$emitGlobal('show-folder-limit-dialog')") 
                        span Stopped after limit of {{ targetDirLimit }} folders 
                a.mainPanel__message(role="button", v-if="isTargetLoading", @click="abortLoading")
                    br
                    gb-spinner(color="blue", size="medium")
                    span Click to abort loading
                 
                DirList(v-if="isTargetLoaded", :dirItems="dirItems", v-model="targetPath",
                        :markPathSelected="sourcePath",        
                        :markPathPlayed="playedFileItemDirPath", 
                        isFirstItemRoot=true)
</template>

<script>
    import nodePath from 'path'
    import { sync, get } from 'vuex-pathify'
    import DirItem from '@/model/DirItem'
    import DirList from './DirList'
    import {selectSingleFolder} from '@/helpers/dialogHelper'
    import FavDirIcon from './FavDirIcon'
    import {TARGET_TOGGLER_TOOLTIP_PREFIX} from '@/constants'

    const CANCEL_TOKEN_FACTORY_NAME = 'ctf-target-panel';
    
    export default {
        data: () => ({
            error: '',
            isTargetDirLimitedExceeded: false,
            dirItems: false
        }),
        computed: {
            ...get([
                'config/sourcePath',
                'player/playedFileItem'
            ]),
            ...sync([
                'files/isTargetLoading',
                'files/isTargetLoaded',
                'config/targetPath',
                'config/showTargetPanel',
                'config/targetDirLimit'
            ]),
            playedFileItemDirPath() {
                return this.playedFileItem ? this.playedFileItem.parentDir : null;
            }
        },
        watch: {
            'targetPath': function() {
                this.reload();
                this.$emitGlobal('recalculate-duplicates');
            }
        },
        methods: {
            abortLoading() {
                this.$cancelCancellationToken(CANCEL_TOKEN_FACTORY_NAME);
            },
            selectTargetPath() {
                selectSingleFolder({
                        title: 'Select target folder',
                        preselectedPath: this.targetPath
                    })
                    .then(path => this.targetPath = path)
                    .catch(err => this.$log.warn('Failed to select targetPath: ', err));
            },
            async reload() {
                if (this.isTargetLoading) {
                    this.$log.warn('Skip reload - Target panel already loading');
                    return;
                }
                this.isTargetLoaded = false;
                this.dirItems = null;
                this.isTargetLoading = true;
                this.isTargetDirLimitedExceeded = false;
                this.error = '';
                
                let cancellationToken = this.$createCancellationToken(CANCEL_TOKEN_FACTORY_NAME);
                
                if (this.targetPath) {
                    try {
                        let {dirItems, isLimitExceeded} = await DirItem.loadRecursively({
                            path: this.targetPath,
                            limit: this.targetDirLimit,
                            cancellationToken,
                            includeRootPath: true
                        });
                        this.isTargetDirLimitedExceeded = isLimitExceeded;
                        this.dirItems = dirItems;
                        this.isTargetLoaded = true;
                    } catch (err) {
                        this.error = err;
                    }
                }
                this.$cancelCancellationToken(CANCEL_TOKEN_FACTORY_NAME);
                this.isTargetLoading = false;
            },
            insertPathOrRefresh(dirPath) {
                let parentPath = nodePath.resolve(dirPath, '..'),
                    isParentPathVisible = this.dirItems.find(it => it.path === parentPath);
                
                if (isParentPathVisible) {
                    this.dirItems.push(new DirItem(dirPath));
                    DirItem.sortList(this.dirItems);
                } else {
                    this.reload();
                }
            }
        },
        components: {
            DirList,
            FavDirIcon
        },
        created() {
            this.TOGGLER_TOOLTIP = TARGET_TOGGLER_TOOLTIP_PREFIX + 'Hide Target Panel';
            this.$onGlobal('subdir-created', ({path}) => this.insertPathOrRefresh(path));
            this.reload();
        }
    }
</script>

<style lang="scss">

    @import '~@/styles/mainPanel';

</style>
