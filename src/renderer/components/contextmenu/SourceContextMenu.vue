<template></template>

<script>
    import {sync} from 'vuex-pathify'
    import fileManagerMixin from './fileManagerMixin'
    import pathsMixin from './pathsMixin'
    
    import {ARROW_SWAP, ARROW_TARGET} from '@/constants';

    export default {
        mixins: [
            fileManagerMixin,
            pathsMixin
        ],
        computed: sync([
            'config/recurseSource',
            'config/sourcePath',
            'config/lastSourcePaths',
            'config/targetPath'
        ]),
        methods: {
            showMenu() {
                this.$electronContextMenu((menu, Menu, MenuItem) => {

                    this.addRecentPathsMenuItem({menu, isSource: true});

                    this.addParentPathMenuItem({menu, isSource: true});

                    this.addFavDirsMenuItem({
                        menu,
                        path: this.sourcePath,
                        isTarget: false
                    });

                    menu.append(new MenuItem({type: 'separator'}));

                    this.addShowInFileManagerMenuItems({menu, path: this.sourcePath, isDirectory: true});

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Include subfolders',
                        type: 'checkbox',
                        checked: !!this.recurseSource,
                        click: () => this.recurseSource = !this.recurseSource
                    }));

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Set folder in Target ' + ARROW_TARGET,
                        click: () => this.targetPath = this.sourcePath
                    }));

                    menu.append(new MenuItem({
                        label: 'Swap with Target ' + ARROW_SWAP,
                        click: () => this.$store.commit('config/swapPaths')
                    }));

                });
            }
        },
        created() {
            this.$onGlobal('show-source-contextmenu', () => this.showMenu());
        }
    }

</script>



