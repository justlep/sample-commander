<template></template>

<script>
    import DirItem from '@/model/DirItem'
    import {sync} from 'vuex-pathify'
    import {remote} from 'electron'
    import fileManagerMixin from './fileManagerMixin'
    import pathsMixin from './pathsMixin'
    import {ARROW_SOURCE, ARROW_TARGET} from '@/constants';
    
    const {Menu, MenuItem} = remote;

    export default {
        mixins: [
            fileManagerMixin,
            pathsMixin
        ],
        computed: sync([
            'config/sourcePath',
            'config/targetPath'
        ]),
        methods: {
            showMenu({dirItem}) {
                if (!dirItem) {
                    return;
                }
                this.$assert(dirItem instanceof DirItem, 'Invalid dirItem');

                let menu = new Menu();

                this.addShowInFileManagerMenuItems({menu, path: dirItem.path, isDirectory: true, isTarget: true});

                this.addFavDirsMenuItem({menu, path: dirItem.path, isTarget: true});
                
                menu.append(new MenuItem({type: 'separator'}));

                menu.append(new MenuItem({
                    label: 'Create subdirectory...',
                    click: () => this.$emitGlobal('show-create-subdir-dialog', {dirItem})
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


                // ----

                // menu.on('menu-will-close', () => this.$emit('input', null));
                menu.popup({window: remote.getCurrentWindow()});
            }
        },
        created() {
            this.$onGlobal('show-dir-contextmenu', payload => this.showMenu(payload));
        }
    }

</script>



