<template lang="pug">

    .modal.is-active
        .modal-background(@click="close")
        .modal-card
            header.modal-card-head
                p.modal-card-title(style="text-align:left")
                    span.icon--folder-full 
                    |  Folders
                
                .customDirs__tabs
                    gb-tabs(name="foo", v-model="selectedTabValue", :tabs="TABS", size="small")
                
            section.modal-card-body
                .dialog__box

                    table.dialog__table.dialog__table--vmiddle.dialog__table--hoverLines(v-if="pathList.length"): tbody
                        tr(v-for="path in pathList")
                            td.customDirs__buttons
                                FavDirIcon(:path="path")
                            td
                                a.customDirs__link(@contextmenu="showContextMenu(path)", @click="selectPathOrShowOptions(path)") {{ path }}
                            td.dialog__tableButtons.dialog__tableButtons--brackets.customDirs__buttons
                                a(role="button", @click="removeFromList(path)", title="Remove from list"): span.icon--cancel
                                a(role="button", @click="sourcePath = path", :class="path === sourcePath ? 'customDirs--activeDir' : ''") Source
                                    
                                a(role="button", @click="targetPath = path", :class="path === targetPath ? 'customDirs--activeDir' : ''") Target 

                    .dialog__emptyNotice(v-if="!pathList.length")
                        div(v-if="selectedTab.isFav") You haven't bookmarked any folders.
                            .customDirs__bookmarksHelp
                                | You can use the 
                                FavDirIcon(is-static="true")
                                | icons to add folders to the bookmarks.
                        div(v-else) You have no {{ selectedTab.label }} folders.
                                
            footer.modal-card-foot
                .dialog__buttons.dialog__buttons--spread
                    .field: b-checkbox(v-model="isRemoveEverywhereEnabled", type="is-info is-small") 
                        | Make [
                        i.icon--cancel
                        | ] remove folders from all 3 lists  
                    span
                        button.button.is-danger(@click="clearList")
                            span.customDirs__clearBtnIcon.icon--trash
                            | &nbsp;Clear List
                        button.button.is-primary(@click="close") Close

</template>

<script>
    import { sync } from 'vuex-pathify'
    import FavDirIcon from '@/components/FavDirIcon'
    import {
        CUSTOM_DIRS_TAB_VAL_FAVS, 
        CUSTOM_DIRS_TAB_VAL_RECENT_SOURCE, 
        CUSTOM_DIRS_TAB_VAL_RECENT_TARGET, 
        CUSTOM_DIRS_TAB_VAL_DEFAULT } from '@/constants';

    export default {
        props: {
            value: String
        },
        data: () => ({
            selectedTabValue: '',
            isRemoveEverywhereEnabled: false
        }),
        computed: {
            ...sync([
                'config/sourcePath',
                'config/targetPath',
                'config/lastSourcePaths',
                'config/lastTargetPaths',
                'config/favDirs',
                'lastSelectedCustomDirsTabValue'
            ]),
            selectedTab() {
                return this.TABS.find(t => t.value === this.selectedTabValue);
            },
            pathList() {
                let tab = this.selectedTab;
                return tab.isFav ? this.favDirs : tab.isRecentSource ? this.lastSourcePaths : tab.isRecentTarget ? this.lastTargetPaths : []; 
            }
        },
        watch: {
            selectedTab(newTab) {
                if (newTab && newTab.value) {
                    this.lastSelectedCustomDirsTabValue = newTab.value;
                }
            }
        },
        methods: {
            removeFromList(pathToRemove) {
                let tab = this.selectedTab,
                    removeEverywhere = this.isRemoveEverywhereEnabled;
                
                this.$store.commit('config/removePathFromList', {
                    path: pathToRemove,
                    isFav: removeEverywhere || tab.isFav, 
                    isRecentSource: removeEverywhere || tab.isRecentSource, 
                    isRecentTarget: removeEverywhere || tab.isRecentTarget
                });
            },
            clearList() {
                this.$buefy.dialog.confirm({
                    title: `Clear ${this.selectedTab.label} List`,
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
                let tab = this.selectedTab;
                if (tab.isFav) {
                    this.showContextMenu(path);
                } else if (tab.isRecentSource) {
                    this.sourcePath = path;
                    this.close();
                } else if (tab.isRecentTarget) {
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
            this.TABS = [
                {value: CUSTOM_DIRS_TAB_VAL_RECENT_SOURCE, label: 'Recent Source', isRecentSource: true},
                {value: CUSTOM_DIRS_TAB_VAL_RECENT_TARGET, label: 'Recent Target', isRecentTarget: true},
                {value: CUSTOM_DIRS_TAB_VAL_FAVS, label: 'Bookmarks', isFav: true}
            ];
        },
        created() {
            this.selectedTabValue = this.value === CUSTOM_DIRS_TAB_VAL_DEFAULT ? this.lastSelectedCustomDirsTabValue : this.value;
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
