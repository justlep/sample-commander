<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title(style="text-align:left")
                    span.fa.fa-folder &nbsp; 
                    | Folders
                
                .customDirs__tabs
                    dm-tabs(name="foo", v-model="selectedModeId", :tabs="modesForTabs", size="small")
                
            section.modal-card-body
                .dialog__box

                    table.dialog__table.dialog__table--vmiddle.dialog__table--hoverLines(v-if="pathList.length"): tbody
                        tr(v-for="path in pathList")
                            td.customDirs__buttons
                                FavDirIcon(:path="path")
                            td
                                a.customDirs__link(@contextmenu="showContextMenu(path)", @click="selectPathOrShowOptions(path)") {{ path }}
                            td.dialog__tableButtons.dialog__tableButtons--brackets.customDirs__buttons
                                a(role="button", @click="removeFromList(path)", title="Remove from list"): span.fa.fa-window-close
                                a(role="button", @click="sourcePath = path", :class="path === sourcePath ? 'customDirs--activeDir' : ''") Source
                                    
                                a(role="button", @click="targetPath = path", :class="path === targetPath ? 'customDirs--activeDir' : ''") Target 

                    .dialog__emptyNotice(v-if="!pathList.length")
                        div(v-if="currentMode.isFav") You haven't bookmarked any folders.
                            .customDirs__bookmarksHelp
                                | You can use the 
                                FavDirIcon(is-static="true")
                                | icons to add folders to the bookmarks.
                        div(v-else) You have no {{ currentMode.name }} folders.
                                
            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    .field: b-checkbox(v-model="isRemoveEverywhereEnabled", type="is-info is-small") Removing includes all 3 lists  
                    span
                        button.button.is-danger(@click="clearList")
                            span.customDirs__clearBtnIcon.fa.fa-window-close
                            | &nbsp;Clear List
                        button.button.is-primary(@click="close") Close

</template>

<script>
    import { sync } from 'vuex-pathify'
    import FavDirIcon from '@/components/FavDirIcon'
    import {
        CUSTOM_DIRS_MODE_FAVS, 
        CUSTOM_DIRS_MODE_RECENT_SOURCE, 
        CUSTOM_DIRS_MODE_RECENT_TARGET, 
        CUSTOM_DIRS_MODE_DEFAULT } from '@/constants';

    export default {
        props: {
            value: String
        },
        data: () => ({
            selectedModeId: '',
            isRemoveEverywhereEnabled: false
        }),
        computed: {
            ...sync([
                'config/sourcePath',
                'config/targetPath',
                'config/lastSourcePaths',
                'config/lastTargetPaths',
                'config/favDirs',
                'lastCustomDirsMode'
            ]),
            currentMode() {
                return this.modesForTabs.find(mode => mode.id === this.selectedModeId);
            },
            pathList() {
                let mode = this.currentMode;
                return mode.isFav ? this.favDirs : mode.isRecentSource ? this.lastSourcePaths : mode.isRecentTarget ? this.lastTargetPaths : []; 
            }
        },
        watch: {
            currentMode(newMode) {
                if (newMode && newMode.id) {
                    this.lastCustomDirsMode = newMode.id;
                }
            }
        },
        methods: {
            removeFromList(pathToRemove) {
                let mode = this.currentMode,
                    removeEverywhere = this.isRemoveEverywhereEnabled;
                
                this.$store.commit('config/removePathFromList', {
                    path: pathToRemove,
                    isFav: removeEverywhere || mode.isFav, 
                    isRecentSource: removeEverywhere || mode.isRecentSource, 
                    isRecentTarget: removeEverywhere || mode.isRecentTarget
                });
            },
            clearList() {
                this.$buefy.dialog.confirm({
                    title: `Clear ${this.currentMode.name} List`,
                    message: `${this.isRemoveEverywhereEnabled ? 'Cleared folders will be removed from the other lists, too.<br>' : ''} Do you want to continue?`,
                    confirmText: 'Yes, flush\'em',
                    type: 'is-danger',
                    onConfirm: () => {
                        for (let path of this.pathList.slice()) {
                            this.removeFromList(path);
                        }
                    }
                });
            },
            selectPathOrShowOptions(path) {
                let mode = this.currentMode;
                if (mode.isFav) {
                    this.showContextMenu(path);
                } else if (mode.isRecentSource) {
                    this.sourcePath = path;
                    this.close();
                } else if (mode.isRecentTarget) {
                    this.targetPath = path;
                    this.close();
                }
            },
            showContextMenu(path) {
                this.$emitGlobal('show-custom-dir-contextmenu', path);
            },
            close() {
                this.$emit('input', null);
            }
        },
        beforeCreate() {
            this.modesForTabs = [
                {id: CUSTOM_DIRS_MODE_RECENT_SOURCE, name: 'Recent Source', isRecentSource: true},
                {id: CUSTOM_DIRS_MODE_RECENT_TARGET, name: 'Recent Target', isRecentTarget: true},
                {id: CUSTOM_DIRS_MODE_FAVS, name: 'Bookmarks', isFav: true}
            ];
        },
        created() {
            this.selectedModeId = this.value === CUSTOM_DIRS_MODE_DEFAULT ? this.lastCustomDirsMode : this.value;
            this.$onGlobal('close-dialog-requested', () => this.close());
        },
        components: {
            FavDirIcon
        }
    }


</script>

<style lang="scss">

    @import '~@/styles/configDialog';
    
    .customDirs {
        
        &__tabs {
            width: 100%;
            margin-left: -2px;
            padding-top: 10px;
        }
        
        &__link {
            display: block;
        }
        
        &__buttons {
            width: 1%;
            white-space: nowrap;
        }
        
        &--activeDir {
            color: #fff !important;
            font-weight: bold;
        }

        &__bookmarksHelp {
            padding-top: 0.5em;
        }
        
        &__clearBtnIcon {
            font-size: 10px;
        }
    }

</style>
