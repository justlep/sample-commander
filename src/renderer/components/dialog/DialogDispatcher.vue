<template lang="pug">
    
    .dialogs
        transition(name="fade")
            DeleteDialog(v-if="itemCollectionForDelete", v-model="itemCollectionForDelete", :spectrogramsOnly="deleteSpectrogramsOnly")
            RenameDialog(v-if="itemCollectionForRename", v-model="itemCollectionForRename")
            ConvertDialog(v-if="itemCollectionForConvert", v-model="itemCollectionForConvert")
            CreateSubDirDialog(v-if="parentDirItemWrapperForSubDir", v-model="parentDirItemWrapperForSubDir")
            ConfigDialog(v-if="isConfigDialogVisible", v-model="isConfigDialogVisible")
            CopyMoveDialog(v-if="dragDropData", v-model="dragDropData")
            CustomDirsDialog(v-if="customDirsDialogMode", v-model="customDirsDialogMode")
        transition(name="fade")
            HelpDialog(v-if="isHelpDialogVisible", v-model="isHelpDialogVisible")
    
</template>

<script>
    import { sync, get } from 'vuex-pathify'
    import ItemCollection from '@/helpers/ItemCollection'
    import ItemWrapper from '@/helpers/ItemWrapper'
    import DeleteDialog from './DeleteDialog'
    import RenameDialog from './RenameDialog'
    import ConvertDialog from './ConvertDialog'
    import CopyMoveDialog from './CopyMoveDialog'
    import CreateSubDirDialog from './CreateSubDirDialog'
    import CustomDirsDialog from './CustomDirsDialog'
    import ConfigDialog from './ConfigDialog'
    import HelpDialog from './HelpDialog'
    import {
        HOTKEY_CONFIG, 
        HOTKEY_HELP,
        CUSTOM_DIRS_TAB_VAL_FAVS,
        CUSTOM_DIRS_TAB_VAL_RECENT_SOURCE,
        CUSTOM_DIRS_TAB_VAL_RECENT_TARGET,
        CUSTOM_DIRS_TAB_VAL_DEFAULT
    } from '@/constants';
    
    export default {
        data: () => ({
            itemCollectionForDelete: null,
            deleteSpectrogramsOnly: false,
            itemCollectionForRename: null,
            itemCollectionForConvert: null,
            parentDirItemWrapperForSubDir: null,
            isConfigDialogVisible: false,
            isHelpDialogVisible: false,
            customDirsDialogMode: null
        }),
        computed: {
            ...get([
                'config/favDirs'
            ]),
            ...sync([
                'dragDropData'
            ])
        },
        components: {
            DeleteDialog,
            RenameDialog,
            ConvertDialog,
            CreateSubDirDialog,
            ConfigDialog,
            CopyMoveDialog,
            CustomDirsDialog,
            HelpDialog
        },
        methods: {
            showFavDirsDialogIfAvailable() {
                this.isFavDirsDialogVisible = true
            },
            showConfigDialog() {
                if (!this.$isModalDialogVisible()) {
                    this.isConfigDialogVisible = true;
                }
            },
            showHelp() {
                this.isHelpDialogVisible = true;
            }
        },
        created() {
            this.$onGlobal('show-delete-dialog', ({fileItems, spectrogramsOnly}) => {
                this.deleteSpectrogramsOnly = !!spectrogramsOnly;
                this.itemCollectionForDelete = ItemCollection.from(fileItems);
            });
            this.$onGlobal('show-rename-dialog', ({fileItems}) => this.itemCollectionForRename = ItemCollection.from(fileItems));
            this.$onGlobal('show-convert-dialog', ({fileItems}) => this.itemCollectionForConvert = ItemCollection.from(fileItems));
            this.$onGlobal('show-create-subdir-dialog', ({dirItem}) => this.parentDirItemWrapperForSubDir = new ItemWrapper(dirItem));
            this.$onGlobal('show-config-dialog', () => this.isConfigDialogVisible = true);
            this.$onGlobal('show-favdirs-dialog', () => this.customDirsDialogMode = CUSTOM_DIRS_TAB_VAL_FAVS);
            this.$onGlobal('show-recent-source-dirs-dialog', () => this.customDirsDialogMode = CUSTOM_DIRS_TAB_VAL_RECENT_SOURCE);
            this.$onGlobal('show-recent-target-dirs-dialog', () => this.customDirsDialogMode = CUSTOM_DIRS_TAB_VAL_RECENT_TARGET);
            this.$onGlobal('show-custom-dirs-dialog', () => this.customDirsDialogMode = CUSTOM_DIRS_TAB_VAL_DEFAULT);
            this.$onGlobal('show-help-dialog', () => this.isHelpDialogVisible = true);
            this.$mousetrap.bind(HOTKEY_CONFIG, this.showConfigDialog);
            this.$mousetrap.bind(HOTKEY_HELP, this.showHelp);
        },
        beforeDestroy() {
            this.$mousetrap.unbind(HOTKEY_CONFIG, this.showConfigDialog);
            this.$mousetrap.unbind(HOTKEY_HELP, this.showHelp);
        }
    }
    
</script>

<style lang="scss">

    @import '~@/styles/dialog';
    
</style>
