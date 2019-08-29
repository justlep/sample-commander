<template></template>

<script>
    import {sync} from 'vuex-pathify'
    import fileManagerMixin from './fileManagerMixin'
    import pathsMixin from './pathsMixin'
    import {ARROW_SOURCE, ARROW_SWAP} from '@/constants';
    
    export default {
        mixins: [
            fileManagerMixin,
            pathsMixin
        ],
        computed: sync([
            'config/targetPath',
            'config/lastTargetPaths',
            'config/sourcePath',
            'config/targetDirLimit'
        ]),
        methods: {
            showMenu() {
                this.$electronContextMenu((menu, Menu, MenuItem) => {
                    
                    this.addRecentPathsMenuItem({menu, isTarget: true});

                    this.addParentPathMenuItem({menu, isTarget: true});

                    this.addFavDirsMenuItem({
                        menu,
                        path: this.targetPath,
                        isTarget: true
                    });

                    menu.append(new MenuItem({type: 'separator'}));

                    this.addShowInFileManagerMenuItems({menu, path: this.targetPath, isDirectory: true, isTarget: true});

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: `Directory Limit (${this.targetDirLimit})`,
                        click: () => this.showDirectoryLimitDialog()
                    }));

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: ARROW_SOURCE + ' Set folder in Source',
                        click: () => this.sourcePath = this.targetPath
                    }));

                    menu.append(new MenuItem({
                        label: ARROW_SWAP + ' Swap with Source',
                        click: () => this.$store.commit('config/swapPaths')
                    }));
                });
            },
            showDirectoryLimitDialog() {
                this.$emitGlobal('show-maxdirs-config-dialog');
            }
        },
        created() {
            this.$onGlobal('show-target-contextmenu', () => this.showMenu());
        }
    }

</script>



