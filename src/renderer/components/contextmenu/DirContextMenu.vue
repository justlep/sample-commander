<template></template>

<script>
    import DirItem from '@/model/DirItem'
    import {sync} from 'vuex-pathify'
    import fileManagerMixin from './fileManagerMixin'
    import pathsMixin from './pathsMixin'
    import {ARROW_SOURCE, ARROW_TARGET} from '@/constants';
    
    export default {
        mixins: [
            fileManagerMixin,
            pathsMixin
        ],
        computed: sync([
            'config/sourcePath',
            'config/targetPath',
            'config/doubleClickTargetSetsSource'
        ]),
        methods: {
            showMenu({dirItem}) {
                if (!dirItem) {
                    return;
                }
                this.$assert(dirItem instanceof DirItem, 'Invalid dirItem');

                this.$electronContextMenu((menu, Menu, MenuItem) => {

                    this.addShowInFileManagerMenuItems({menu, path: dirItem.path, isDirectory: true, isTarget: true});

                    this.addFavDirsMenuItem({menu, path: dirItem.path, isTarget: true});

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Create subdirectory...',
                        click: () => this.$emitGlobal('show-create-subdir-dialog', {dirItem})
                    }));

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Double-click mode...',
                        submenu: ((subMenu) => {
                            subMenu.append(new MenuItem({
                                label: 'Double-click changes Source Panel',
                                type: 'radio',
                                checked: !!this.doubleClickTargetSetsSource,
                                click: () => this.doubleClickTargetSetsSource = true
                            }));
                            subMenu.append(new MenuItem({
                                label: 'Double-click changes Target Panel',
                                type: 'radio',
                                checked: !this.doubleClickTargetSetsSource,
                                click: () => this.doubleClickTargetSetsSource = false
                            }));
                            return subMenu;
                        })(new Menu())
                    }));

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Folder in Source ' + ARROW_SOURCE,
                        click: () => this.sourcePath = dirItem.path
                    }));

                    menu.append(new MenuItem({
                        label: 'Folder in Target ' + ARROW_TARGET,
                        click: () => this.targetPath = dirItem.path
                    }));

                });
            }
        },
        created() {
            this.$onGlobal('show-dir-contextmenu', payload => this.showMenu(payload));
        }
    }

</script>



