<template lang="pug">
    #app.buttons.are-small
        .app__wrap

            .app__player
                PlayerArea
    
            .app__toolbar
                Toolbar
    
            .app__filter
                FilterSection
    
            .app__main
                multipane.multipane--fullheight(layout="vertical", @paneResizeStop="afterPaneResize")
                    div(style="width: 50%; min-width: 200px; z-index: 2", ref="sourcePanelElem")
                        SourcePanel
    
                    multipane-resizer(v-if="showTargetPanel")
    
                    div(style="flex-grow: 1; flex-shrink: 999999; min-width: 250px", v-show="showTargetPanel")
                        keep-alive: TargetPanel(v-if="showTargetPanel")
    
            //-.app__footer
                div Copyright &copy; 2018 LeP &middot; &middot; &middot; Use at your own risk
                
        SourceContextMenu
        TargetContextMenu
        FileContextMenu
        DirContextMenu
        CustomDirsContextMenu
        DialogDispatcher
</template>

<script>
    import {ipcRenderer, remote, shell} from 'electron'
    import SourceContextMenu from './components/contextmenu/SourceContextMenu'
    import TargetContextMenu from './components/contextmenu/TargetContextMenu'
    import FileContextMenu from './components/contextmenu/FileContextMenu'
    import DirContextMenu from './components/contextmenu/DirContextMenu'
    import CustomDirsContextMenu from './components/contextmenu/CustomDirsContextMenu'
    import DialogDispatcher from './components/dialog/DialogDispatcher'
    import {mapMutations} from 'vuex'
    import {get, sync} from 'vuex-pathify'
    import nodePath from 'path'
    import {stat} from '@/helpers/fileHelper' 
    import SystemInformation from '@/components/SystemInformation'
    import PlayerArea from '@/components/PlayerArea'
    import FilterSection from '@/components/FilterSection'
    import Toolbar from '@/components/Toolbar'
    import {Multipane, MultipaneResizer} from 'vue-multipane'
    import SourcePanel from '@/components/SourcePanel'
    import TargetPanel from '@/components/TargetPanel'
    import {IPC_PREPARE_SHUTDOWN, IPC_SHUTDOWN_PREPARED, IPC_GO_BACK_PRESSED} from '@/constants'
    
    export default {
        name: 'sample-commander',
        components: {
            SourceContextMenu,
            TargetContextMenu,
            FileContextMenu,
            DirContextMenu,
            CustomDirsContextMenu,
            DialogDispatcher,
            SystemInformation,
            PlayerArea,
            FilterSection,
            Toolbar,
            Multipane,
            MultipaneResizer,
            SourcePanel,
            TargetPanel
        },
        computed: {
            ...get([
                'config/showTargetPanel',
                'config/sourcePath',
                'config/targetPath'
            ]),
            ...sync([
                'config/sourcePanelWidth'
            ])
        },
        watch: {
            'showTargetPanel': function(visible) {
                let newSourcePanelWidth = visible ? (this.sourcePanelWidth || '60%') : '100%';
                this.$nextTick(() => {
                    this.$refs.sourcePanelElem.style.width = newSourcePanelWidth;
                    this.$emitGlobal('focus-played-file');
                });
            },
            sourcePath(newPath) {
                this.addLastSourcePath(newPath);
            },
            targetPath(newPath) {
                this.addLastTargetPath(newPath);
            }
        },
        methods: {
            ...mapMutations('config', [
                'loadPersistentConfig',
                'savePersistentConfig',
                'addLastSourcePath',
                'addLastTargetPath'
            ]),
            open(link) {
                this.$electron.shell.openExternal(link);
            },
            afterPaneResize(pane, container, size) {
                this.sourcePanelWidth = size;
            }
        },
        created() {
            this.loadPersistentConfig();
            
            ipcRenderer.once(IPC_PREPARE_SHUTDOWN, () => {
                this.$log.dev('Prepare shutdown..');
                this.savePersistentConfig();
                this.$log.dev('Shutdown is prepared');
                ipcRenderer.send(IPC_SHUTDOWN_PREPARED);
            });
            
            ipcRenderer.on(IPC_GO_BACK_PRESSED, () => this.$emitGlobal('go-back'));
            
            // TODO this won't fix the image cache
            this.$onGlobal('clear-electron-cache', () => {
                let win = remote.getCurrentWindow();
                win.webContents.session.clearCache(() => {
                    this.$log.dev('Electron session cache cleared');
                    //alert('cache cleared');
                });
            });
            
            this.$onGlobal('show-path-in-explorer', async path => {
                let pathToOpen = nodePath.normalize(path);
                try {
                    let pathStat = await stat(path);
                    
                    if (pathStat) {
                        if (pathStat.isDirectory()) {
                            // shell.openPath() resolves (not rejects!) with an error message if failed
                            // see: https://www.electronjs.org/docs/api/shell#shellopenpathpath
                            let errorMessage = await shell.openPath(pathToOpen);
                            if (errorMessage) {
                                throw new Error(errorMessage);
                            }
                        } else if (pathStat.isFile()) {
                            shell.showItemInFolder(pathToOpen);
                        }
                    } 
                } catch (err) {
                    // nothing
                    console.warn('failed to show path %s', pathToOpen);
                }
            });
            
            this.$mousetrap.bind('esc', () => this.$emitGlobal('close-dialog-requested'));
        },
        mounted() {
            this.$refs.sourcePanelElem.style.width = this.showTargetPanel ? this.sourcePanelWidth : '100%';
        },
        destroyed() {
            throw new Error('Unexpected destroy. Add event cleanup otherwise');
        }
    }
</script>

<style lang="scss">
    @import "~@/styles/app";
</style>

