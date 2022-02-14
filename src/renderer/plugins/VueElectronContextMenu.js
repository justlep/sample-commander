import {getCurrentWindow, Menu, MenuItem} from '@electron/remote';

/**
 * Adds global $electronContextMenu method to Vue's prototype,
 * allowing to quickly create and popup Electron context menus from within any component.

 * Usage:
 *
 *   (1) Register plugin with Vue:
 *          import VueElectronContextMenu from 'VueElectronContextMenu'
 *          Vue.use(VueElectronContextMenu);
 *
 *   (2) Inside any component, create & show a context menu by calling:
 *          this.$electronContextMenu((menu, Menu, MenuItem) => {
 *              menu.append(new MenuItem({
 *                  label: 'First clickable item in the context menu',
 *                  click: () => alert('huhu1')
 *              }));
 *              
 *              menu.append(new MenuItem({type: 'separator'}));
 *              
 *              menu.append(new MenuItem({
 *                  label: 'Second clickable item in the context menu',
 *                  click: () => alert('huhu2')
 *              }));
 *          });
 *
 * @author Lennart Pegel
 * @license MIT
 */

export default {
    install(Vue) {

        /**
         * @param {VueElectronContextMenu_callback} fn
         */
        Vue.prototype.$electronContextMenu = (fn) => {
            let menu = new Menu();

            fn(menu, Menu, MenuItem);

            menu.popup({window: getCurrentWindow()});
        }
    }
}

/**
 * @callback VueElectronContextMenu_callback
 * @param {Electron.Menu} menu - a newly created Menu instance to be populated by the callback
 * @param {Class<Electron.Menu>} Menu - Electron's Menu class
 * @param {Class<Electron.MenuItem>} MenuItem - Electron's MenuItem class
 */
