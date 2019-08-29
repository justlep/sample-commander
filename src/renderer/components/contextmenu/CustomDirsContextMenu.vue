<template></template>

<script>
    import {sync} from 'vuex-pathify'
    import fileManagerMixin from './fileManagerMixin'
    import {ARROW_SOURCE, ARROW_TARGET} from '@/constants';

    export default {
        mixins: [
            fileManagerMixin
        ],
        computed: sync([
            'config/sourcePath',
            'config/targetPath'
        ]),
        methods: {
            showMenu(path) {
                if (!path) {
                    return;
                }

                this.$electronContextMenu((menu, Menu, MenuItem) => {

                    this.addShowInFileManagerMenuItems({menu, path, isDirectory: true, isTarget: true});

                    menu.append(new MenuItem({type: 'separator'}));

                    menu.append(new MenuItem({
                        label: 'Folder in Source ' + ARROW_SOURCE,
                        click: () => this.sourcePath = path
                    }));

                    menu.append(new MenuItem({
                        label: 'Folder in Target ' + ARROW_TARGET,
                        click: () => this.targetPath = path
                    }));
                });
            }
        },
        created() {
            this.$onGlobal('show-custom-dir-contextmenu', path => this.showMenu(path));
        }
    }

</script>



