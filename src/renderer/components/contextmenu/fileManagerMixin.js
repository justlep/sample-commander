import { mapGetters } from 'vuex'
import { get } from 'vuex-pathify'
import { MenuItem } from '@electron/remote'
import { SYSTEM_FILEMANAGER_NAME } from '@/constants'

const nodeSpawn = require('child_process').spawn;

export default {
    computed: {
        ...mapGetters('config', [
            'fileManagerName',
            'isFileManagerTotalCommander'
        ]),
        ...get([
            'config/fileManagerExecutablePath',
            'config/sourcePath',
            'config/targetPath'
        ])
    },
    methods: {
        /**
         * @param {Electron.Menu} menu
         * @param {string} path
         * @param {boolean} [isDirectory]
         * @param {boolean} [isTarget] - if true and the file manager is TotalCommander, a target path will be opened
         *                               in TotalCommander's right panel, otherwise in its panel (both as tabs)
         * @returns {Electron.MenuItem}
         */
        addShowInFileManagerMenuItems({menu, path, isDirectory, isTarget}) {
            menu.append(new MenuItem({
                label: 'Show in ' + SYSTEM_FILEMANAGER_NAME,
                click: () => this.$emitGlobal('show-path-in-explorer', path)
            }));
            
            menu.append(new MenuItem({
                label: 'Show in ' + this.fileManagerName,
                enabled: !!this.fileManagerExecutablePath,
                click: () => {
                    let cliArgs = [path];
                    if (this.isFileManagerTotalCommander) {
                        // TotalCommander CLI options -> http://www.ghisler.ch/wiki/index.php/Command_line_parameters
                        cliArgs = ['/O', '/T', (isTarget ? '/R=' : '/L=') + path]
                    }
                    nodeSpawn(this.fileManagerExecutablePath, cliArgs, {
                        detached: true,
                        stdio: 'ignore',
                        shell: false
                    });
                }
            }));

            /**
             * Total Commander ONLY -> open source & target path simultaneously in Total Commanders left & right panel 
             */
            if (isDirectory && !isTarget && this.isFileManagerTotalCommander) {
                // this is the source panel, apparently
                menu.append(new MenuItem({
                    label: 'Show Source + Target in ' + this.fileManagerName,
                    enabled: !!this.fileManagerExecutablePath,
                    click: () => {
                        // TotalCommander CLI options -> http://www.ghisler.ch/wiki/index.php/Command_line_parameters
                        let cliArgs = ['/O', '/T', `/L=${this.sourcePath}`, `/R=${this.targetPath}`];
                        nodeSpawn(this.fileManagerExecutablePath, cliArgs, {
                            detached: true,
                            stdio: 'ignore',
                            shell: false
                        });
                    }
                }));
            }
        }
    }
}
