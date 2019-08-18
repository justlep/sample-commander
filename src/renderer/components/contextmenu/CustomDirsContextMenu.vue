<template></template>

<script>
    import {sync} from 'vuex-pathify'
    import {remote} from 'electron'
    import fileManagerMixin from './fileManagerMixin'
    import {ARROW_SOURCE, ARROW_TARGET} from '@/constants';

    const {Menu, MenuItem} = remote;

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
                let menu = new Menu();

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

                // menu.on('menu-will-close', () => this.$emit('input', null));
                menu.popup({window: remote.getCurrentWindow()});
            }
        },
        created() {
            this.$onGlobal('show-custom-dir-contextmenu', path => this.showMenu(path));
        }
    }

</script>



