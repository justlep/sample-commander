<template></template>

<script>
    import FileItem from '@/model/FileItem'
    import {sync, get} from 'vuex-pathify'
    import {remote} from 'electron'
    import path from 'path'
    import fileManagerMixin from './fileManagerMixin'
    import { SYSTEM_FILEMANAGER_NAME, ARROW_SOURCE, ARROW_TARGET } from '@/constants'
    
    const nodeSpawn = require('child_process').spawn;

    export default {
        mixins: [
            fileManagerMixin
        ],
        computed: {
            ...get([
                'files/duplicateMode',
                'config/editorExecutablePath'
            ]),
            ...sync([
                'config/recurseSource',
                'config/sourcePath',
                'config/targetPath',
                'config/lastSourcePaths'
            ])
        },
        methods: {
            showMenu({fileItem, canSelectAll, canDeselectAll, selectedFileItems}) {
                if (!fileItem) {
                    return;
                }
                this.$assert(fileItem instanceof FileItem, 'Invalid fileItem');

                this.$electronContextMenu((menu, Menu, MenuItem) => {
                    let fileFolderPath = path.resolve(fileItem.path, '..'),
                        duplicatePaths = this.duplicateMode.isWith && fileItem.getDuplicatePathsWithoutSelf(),
                        totalDuplicates = duplicatePaths && duplicatePaths.length,
                        itemSelection = (selectedFileItems || [fileItem]);

                    this.addShowInFileManagerMenuItems({menu, path: fileItem.path});

                    if (totalDuplicates) {
                        menu.append(new MenuItem({
                            label: 'Show Duplicates in ' + SYSTEM_FILEMANAGER_NAME,
                            submenu: ((subMenu) => {
                                if (totalDuplicates > 1) {
                                    subMenu.append(new MenuItem({
                                        label: `Show All (${totalDuplicates})`,
                                        click: () => duplicatePaths.forEach(filePath => this.$emitGlobal('show-path-in-explorer', filePath))
                                    }));
                                    subMenu.append(new MenuItem({type: 'separator'}));
                                }
                                for (let path of duplicatePaths) {
                                    subMenu.append(new MenuItem({
                                        label: path,
                                        click: (menuItem) => this.$emitGlobal('show-path-in-explorer', menuItem.label)
                                    }));
                                }
                                return subMenu;
                            })(new Menu())
                        }));
                    }

                    menu.append(new MenuItem({type: 'separator'}));


                    menu.append(new MenuItem({
                        label: 'Open with Default Application',
                        click: () => remote.shell.openPath(fileItem.path)
                    }));

                    if (fileItem.isAudioFile) {
                        let isConfigured = /\.exe$/i.test(this.editorExecutablePath);
                        menu.append(new MenuItem({
                            label: `Open with Audio Editor${isConfigured ? '' : ' (not configured)'}`,
                            enabled: isConfigured,
                            click: () => {
                                if (!this.editorExecutablePath) {
                                    return this.showEditorWarning();
                                }
                                nodeSpawn(this.editorExecutablePath, [fileItem.path], {
                                    detached: true,
                                    stdio: 'ignore',
                                    shell: false
                                });
                            }
                        }));
                    }


                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Rename selected...',
                        click: () => this.$emitGlobal('show-rename-dialog', {fileItems: itemSelection})
                    }));

                    menu.append(new MenuItem({
                        label: 'Convert selected...',
                        click: () => this.$emitGlobal('show-convert-dialog', {fileItems: itemSelection})
                    }));

                    menu.append(new MenuItem({
                        label: 'Delete selected...',
                        submenu: ((subMenu) => {
                            subMenu.append(new MenuItem({
                                label: 'Files',
                                click: () => this.$emitGlobal('show-delete-dialog', {fileItems: itemSelection})
                            }));

                            subMenu.append(new MenuItem({
                                label: 'Spectrograms only',
                                click: () => this.$emitGlobal('show-delete-dialog', {
                                    fileItems: itemSelection,
                                    spectrogramsOnly: true
                                })
                            }));

                            return subMenu;
                        })(new Menu())
                    }));

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Folder in Source ' + ARROW_SOURCE,
                        click: () => this.sourcePath = fileFolderPath
                    }));

                    menu.append(new MenuItem({
                        label: 'Folder in Target ' + ARROW_TARGET,
                        click: () => this.targetPath = fileFolderPath
                    }));

                    if (canSelectAll || canDeselectAll) {

                        menu.append(new MenuItem({type: 'separator'}));

                        if (canSelectAll) {
                            menu.append(new MenuItem({
                                label: 'Select All',
                                accelerator: 'CmdOrCtrl+A',
                                click: () => this.$emitGlobal('select-all-files')
                            }));
                        }

                        if (canDeselectAll) {
                            menu.append(new MenuItem({
                                label: 'Deselect All',
                                accelerator: 'CmdOrCtrl+D',
                                click: () => this.$emitGlobal('deselect-all-files')
                            }));
                        }
                    }
                    
                });
            },
            showEditorWarning() {
                this.$buefy.snackbar.open({
                    message: 'You need to select your default Audio editor first',
                    type: 'is-warning',
                    position: 'is-top',
                    actionText: 'Configure',
                    duration: 5000,
                    onAction: () => this.$emitGlobal('show-')
                })
            }
        },
        created() {
            this.$onGlobal('show-file-contextmenu', payload => this.showMenu(payload));
        }
    }

</script>



