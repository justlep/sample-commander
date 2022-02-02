<template lang="pug">
    
    .mainPanel(:class="isFiltered ? 'mainPanel--filtered' : ''")
        .mainPanel__header
            a.mainPanel__button.fa.fa-redo(role="button", @click.stop="onReloadClick", title="Refresh. Use [Shift]+click to flush caches") 
            a.mainPanel__button.fa-folder(role="button", @click.stop="recurseSource = !recurseSource", 
                                :title="`Subfolders are ${recurseSource ? 'INCLUDED' : 'EXCLUDED'}`", 
                                :class="recurseSource ? 'fa' : 'far'") 
            .mainPanel__path(@click="selectSourcePath", @contextmenu="$emitGlobal('show-source-contextmenu')", :title="tooltip") 
                FavDirIcon(:path="sourcePath")
                | {{ sourcePath }}
            a.mainPanel__button.fa(role="button", @click.stop="toggleTargetPanel", 
                                   :class="showTargetPanel ? 'fa-chevron-right' : 'fa-chevron-left'",
                                   :title="targetTogglerTooltip")
            //- alternative arrows for above -> 'fa-arrow-right' : 'fa-arrow-left'
        .mainPanel__content
            .mainPanel__scrollable.mainPanel__scrollable--source(ref="scrollContainerElem", @mousedown="onMouseDown", data-rect-select)
                .mainPanel__message(v-if="error"): b-tag(type="is-danger", closable, attached, @close="error = ''") {{ error }}
                .mainPanel__message(v-if="noFilesMessage"): b-tag(type="is-info", attached) {{ noFilesMessage }}
                .mainPanel__message(v-if="isSourceFileLimitExceeded"): b-tag(type="is-danger", closable, attached, @close="isSourceFileLimitExceeded = false") Stopped after limit of {{ sourceFileLimit }} files
                a.mainPanel__message(role="button", v-if="isSourceLoading", @click="abortLoading")
                    br
                    gb-spinner(color="blue", size="medium")
                    span Click to abort loading
                a.mainPanel__message(role="button", v-if="concurrentDuplicateChecks", @click="abortDuplicateCheck")
                    br
                    gb-spinner(color="blue", size="medium")
                    span Checking for duplicates.. <br>Click to abort 
                FileList(v-show="filteredFileItems.length", :fileItems="filteredFileItems", :rect-selector="rectSelector")
    
        FileInfoLoader(:fileItems="filteredFileItems")  
            
</template>

<script>
    import { get, sync } from 'vuex-pathify'
    import {selectSingleDirectory} from '@/helpers/dialogHelper'
    import FileList from './FileList'
    import FileItem from '@/model/FileItem'
    import FileInfoLoader from './FileInfoLoader'
    import {checkDuplicateFileItems} from '@/helpers/FileComparer'
    import {FileInfoProcessingQueue} from '@/processing/FileInfoProcessingQueue'
    import FavDirIcon from './FavDirIcon'
    import {HOTKEY_TOGGLE_TARGET_PANEL, DUPLICATE_MODE, TARGET_TOGGLER_TOOLTIP_PREFIX} from '@/constants'
    import {RectSelector} from '@/helpers/RectSelector'
    
    const LOADER_CANCELLATION_TOKEN_FACTORY_NAME = 'source-panel-loader';
    const DUPLICATES_CANCELLATION_TOKEN_FACTORY_NAME = 'source-panel-duplicate-check';
    
    export default {
        data: () => ({
            error: '',
            concurrentDuplicateChecks: 0,
            unfilteredFileItems: [],
            isSourceFileLimitExceeded: false,
            rectSelector: new RectSelector()
        }),
        components: {
            FileList,
            FileInfoLoader,
            FavDirIcon
        },
        computed: {
            ...get([
                'config/targetPath',
                'files/filter',
                'files/filterLowercase',
                'config/ffprobeExecutablePath',
                'config/disableSpectrogramsOnDirChange',
                'config/sourceFileLimit',
                'config/duplicateCheckQuickMode'
            ]),
            ...sync([
                'files/duplicateMode',
                'files/isSourceLoading',
                'files/isSourceLoaded',
                'config/recurseSource',
                'config/sourcePath',
                'config/showTargetPanel',
                'spectrogramSize'
            ]),
            tooltip() {
                let total = this.unfilteredFileItems.length,
                    totalSize = this.unfilteredFileItems.reduce((sum, item) => (sum + item.filesize), 0);
                return `${total} file${total === 1 ? '' : 's'} / ${(totalSize/1024/1024).toFixed(1)} MB`;
            },
            nameFilteredFileItems() {
                let items = (this.isSourceLoaded && this.unfilteredFileItems) || [],
                    filter = items.length && this.filterLowercase; 
                
                return filter ? items.filter(it => it.filename.toLowerCase().includes(filter)) : items;
            },
            filteredFileItems() {
                let items = this.nameFilteredFileItems,
                    dupMode = this.duplicateMode,
                    effectiveItems;
                    
                if (!items.length || dupMode.isAll) {
                    effectiveItems = items;
                } else if (this.concurrentDuplicateChecks) {
                    effectiveItems = [];
                } else if (dupMode.isWith) {
                    effectiveItems = items.filter(it => it.hasDuplicates());
                } else if (dupMode.isWithout) {
                    effectiveItems = items.filter(it => it.isUnique());
                } else {
                    this.$log.warn('Unexpected state, some dupMode added lately? duplicateMode = %o, items = %o', dupMode, items);
                    throw new Error('Unexpected state');
                }
                return effectiveItems;
            },
            isFiltered() {
                return !!this.filter || !this.duplicateMode.isAll;
            },
            noFilesMessage() {
                if (this.isSourceLoaded && !this.filteredFileItems.length) {
                    const recursionDisabledSuffix = this.recurseSource ? '' : ' (Recursion disabled)';
                    if (this.filter) {
                        return `No matches for filter "${this.filter}"`;
                    }
                    if (this.duplicateMode.isAll) {
                        return 'No audio files found' + recursionDisabledSuffix;
                    }
                    if (!this.concurrentDuplicateChecks) {
                        return this.duplicateMode.isWith ? 
                            'Source contains no files with duplicates in the target folder' + recursionDisabledSuffix : 
                            'Source contains no files, or none without duplicates in the target folder' + recursionDisabledSuffix;
                    }
                }
                return null;
            },
            targetTogglerTooltip() {
                return TARGET_TOGGLER_TOOLTIP_PREFIX + (this.showTargetPanel ? 'Maximize Source panel (hiding Target panel)' : 'Restore Target panel');
            }
        },
        watch: {
            duplicateMode(newMode, oldMode) {
                if (newMode.isAll) {
                    this.abortDuplicateCheck();
                } else if (oldMode.isAll) {
                    // only trigger recalc upon transition from `isAll` to `non-isAll`
                    this.$emitGlobal('recalculate-duplicates');
                }
            },
            sourcePath() {
                if (this.disableSpectrogramsOnDirChange) {
                    this.spectrogramSize = 0;
                }
                this.reload();
            },
            filterLowercase(newVal, oldVal) {
                if (oldVal && !newVal) {
                    this.$emitGlobal('focus-played-file');
                }
            },
            recurseSource() {
                this.reload();
            },
            isSourceLoaded(isLoaded) {
                if (isLoaded) {
                    this.$emitGlobal('recalculate-duplicates');
                    this.$nextTick(() => this.$buefy.toast.open({
                        message: this.tooltip,
                        position: 'is-bottom',
                        duration: 3000,
                        queue: false
                    }));
                }
            },
            showTargetPanel() {
                this.rectSelector.setCancelled();
            },
            spectrogramSize() {
                this.rectSelector.setCancelled();
            }
        },
        methods: {
            toggleTargetPanel() {
                this.showTargetPanel = !this.showTargetPanel;
            },
            onReloadClick(e) {
                if (e.shiftKey || e.ctrlKey) {
                    this._processingQueue.flushAllCaches();
                    // TODO try to flush electron's image cache here, too
                }
                this.reload();
            },
            onMouseDown(e) {
                if (e.target.hasAttribute('data-rect-select')) {
                    // start rectangle-selection via mouse if clicked inside supporting container elements
                    this.rectSelector.activate({
                        containerElem: this.$refs.scrollContainerElem,
                        mouseEvent: e
                    });
                }
            },
            selectSourcePath() {
                selectSingleDirectory({
                        title: 'Select source directory',
                        preselectedPath: this.sourcePath 
                    })
                    .then(path => this.sourcePath = path)
                    .catch(err => this.$log.error('Failed to select sourcePath: ', err));
            },
            abortLoading() {
                this.$cancelCancellationToken(LOADER_CANCELLATION_TOKEN_FACTORY_NAME);
            },
            abortDuplicateCheck() {
                this.$cancelCancellationToken(DUPLICATES_CANCELLATION_TOKEN_FACTORY_NAME);
            },
            async reload() {
                if (this.isSourceLoading) {
                    this.$log.warn('Skip reload - Source panel already loading');
                    return;
                }
                this.isSourceLoaded = false;
                this.isSourceLoading = true;
                this.isSourceFileLimitExceeded = false;
                this.error = '';
                let cancellationToken = this.$createCancellationToken(LOADER_CANCELLATION_TOKEN_FACTORY_NAME);
                
                if (this.sourcePath) {
                    try {
                        let {fileItems, isLimitExceeded} = await FileItem.findInPath({
                            path: this.sourcePath,
                            recursive: this.recurseSource,
                            cancellationToken,
                            limit: this.sourceFileLimit || Number.MAX_SAFE_INTEGER
                        });
                        this.isSourceFileLimitExceeded = isLimitExceeded;
                        this.unfilteredFileItems = fileItems;
                        this.isSourceLoaded = true;
                    } catch (err) {
                        this.error = err;
                    }
                }
                this.isSourceLoading = false;
                this.$emitGlobal('focus-played-file');
            },
            updateDuplicatesInfo() {
                if (!this.targetPath || !this.isSourceLoaded) {
                    return;
                }

                this.concurrentDuplicateChecks++;
                
                let cancellationToken = this.$createCancellationToken(DUPLICATES_CANCELLATION_TOKEN_FACTORY_NAME),
                    {targetPath} = this;
                
                FileItem.findInPath({
                    path: targetPath,
                    recursive: true,
                    onlySameSizesAs: this.unfilteredFileItems,
                    cancellationToken
                })
                .then(({fileItems, isLimitExceeded}) => {
                    // TODO add a dedicated "duplicate-check" files limit to config, then use it here
                    if (isLimitExceeded || cancellationToken.isCancelled()) {
                        return null;
                    }
                    return checkDuplicateFileItems({
                        sourceItems: this.unfilteredFileItems, 
                        targetItems: fileItems,
                        quickMode: this.duplicateCheckQuickMode,
                        cancellationToken
                    }); 
                })
                .catch(err => this.$log.warn(err))
                .then(() => {
                    this.concurrentDuplicateChecks = Math.max(0, this.concurrentDuplicateChecks - 1);
                    if (cancellationToken.isCancelled()) {
                        this.$log.dev('Cancelled duplicate check');
                        this.duplicateMode = DUPLICATE_MODE.ALL;
                    }
                });
            },
            cleanupRenamedOrDeletedFileItems() {
                if (!this.isSourceLoaded) {
                    return;
                }
                let newFilePathsToLookup = [];
                for (let i = this.unfilteredFileItems.length - 1; i >= 0; i--) {
                    let item = this.unfilteredFileItems[i];
                    if (item.isDeleted || item.renamedIntoPath) {
                        this._processingQueue.flushCachesForFileItem(item);
                        this.unfilteredFileItems.splice(i, 1);
                        if (item.renamedIntoPath) {
                            newFilePathsToLookup.push(item.renamedIntoPath);
                        }
                    }
                }
                if (newFilePathsToLookup) {
                    FileItem.getByPaths({
                        paths: newFilePathsToLookup 
                    })
                    .then(newFileItems => {
                        if (!newFileItems.length) {
                            return;
                        }
                        this.unfilteredFileItems.push(...newFileItems);
                        FileItem.sortList(this.unfilteredFileItems);
                    });
                }
            }
        },
        created() {
            /** @type {FileInfoProcessingQueue} */
            this._processingQueue = FileInfoProcessingQueue.getInstance();
            this.$onGlobal('files-moved-or-copied', () => this.reload());
            this.$onGlobal('source-reload-requested', () => this.reload());
            this.$onGlobal('files-renamed-or-deleted', () => this.cleanupRenamedOrDeletedFileItems());
            this.$onGlobal('recalculate-duplicates', () => !this.duplicateMode.isAll && this.updateDuplicatesInfo());
            this.$mousetrap.bind(HOTKEY_TOGGLE_TARGET_PANEL, this.toggleTargetPanel);
            this.reload();
        },
        beforeDestroy() {
            this.abortLoading();
            this.abortDuplicateCheck();
            this.$mousetrap.unbind(HOTKEY_TOGGLE_TARGET_PANEL, this.toggleTargetPanel);
        }
    }
</script>

<style lang="scss">

    @import '~@/styles/variables';
    @import '~@/styles/mainPanel';
    
</style>
