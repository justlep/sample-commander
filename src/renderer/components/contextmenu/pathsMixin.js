import {sync} from 'vuex-pathify'
import {Menu, MenuItem} from '@electron/remote'

/**
 * Provides "Recent Folder" menu item functionality.   
 */
export default {
    computed: {
        ...sync([
            'config/favDirs',
            'config/sourcePath',
            'config/targetPath'
        ])
    },
    methods: {
        /**
         * @param {Electron.Menu} menu
         * @param {boolean} [isSource]
         * @param {boolean} [isTarget]
         */
        addParentPathMenuItem({menu, isSource, isTarget}) {
            if (!isSource && !isTarget) {
                return;
            }
            menu.append(new MenuItem({
                label: 'Parent Folder',
                click: () => {
                    this.$store.commit(isSource ? 'config/gotoParentSourceDir' : 'config/gotoParentTargetDir')
                }
            }));
        },

        /**
         * @param {Electron.Menu} menu
         * @param {boolean} [isSource]
         * @param {boolean} [isTarget]
         */
        addRecentPathsMenuItem({menu, isSource, isTarget}) {
            let pathList = isSource ? this.lastSourcePaths : isTarget ? this.lastTargetPaths : null;
            if (!pathList || (!isSource && !isTarget)) {
                throw new Error('Dunno which path list');
            }
            menu.append(new MenuItem({
                label: 'Recent Folders',
                enabled: !!pathList.length,
                submenu: (subMenu => {
                    for (let path of pathList) {
                        subMenu.append(new MenuItem({
                            label: path,
                            click: (menuItem) => {
                                if (isSource) {
                                    this.sourcePath = menuItem.label;
                                } else {
                                    this.targetPath = menuItem.label;
                                }
                            }
                        }));
                    }
                        
                    if (!pathList.length) {
                        return;
                    }

                    subMenu.append(new MenuItem({type: 'separator'}));

                    subMenu.append(new MenuItem({
                        label: 'Customize...',
                        click: () => this.$emitGlobal(isSource ? 'show-recent-source-dirs-dialog' : 'show-recent-target-dirs-dialog')
                    }));
                    
                    return subMenu;
                })(new Menu())
            }));
        },

        /**
         * @param {Electron.Menu} menu
         * @param {string} path
         * @param {boolean} [isTarget]
         * @returns {Electron.MenuItem}
         */
        addFavDirsMenuItem({menu, path, isTarget}) {
            let subMenu = new Menu(),
                isFav = this.favDirs.includes(path),
                otherFavPaths = this.favDirs.filter(p => p !== path);

            subMenu.append(new MenuItem({
                label: isFav ? 'Remove Folder from Bookmarks' : 'Add Folder to Bookmarks',
                click: () => this.$store.commit('config/toggleFavDir', path)
            }));

            if (otherFavPaths.length) {
                subMenu.append(new MenuItem({type: 'separator'}));

                otherFavPaths.forEach(favPath => {
                    if (favPath === path) {
                        return;
                    }
                    subMenu.append(new MenuItem({
                        label: favPath,
                        click: (menuItem) => this[isTarget ? 'targetPath' : 'sourcePath'] = menuItem.label
                    }));
                });
            }

            if (this.favDirs.length) {
                subMenu.append(new MenuItem({type: 'separator'}));
                subMenu.append(new MenuItem({
                    label: 'Customize...',
                    click: () => this.$emitGlobal('show-favdirs-dialog')
                }));
            }

            menu.append(new MenuItem({
                label: 'Bookmarks',
                submenu: subMenu
            }));
        }
    }
    
}
