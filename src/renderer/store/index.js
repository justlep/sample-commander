import Vue from 'vue'
import Vuex from 'vuex'
import pathify from './pathify'
import { make } from 'vuex-pathify'
import files from './modules/files'
import player from './modules/player'
import config from './modules/config'
import {CUSTOM_DIRS_MODE_FAVS} from '@/constants'
 
Vue.use(Vuex);

const state = {
    /** @type {ItemCollection<FileItem>} */
    draggedFileItemCollection: null,
    /** @type {DragDropData} */
    dragDropData: null,    
    spectrogramSize: 0,
    lastCustomDirsMode: CUSTOM_DIRS_MODE_FAVS,
    isMousewheelResizingDisabled: false
};

export default new Vuex.Store({
    strict: process.env.NODE_ENV !== 'production',
    state,
    mutations: make.mutations(state),
    modules: {
        files,
        player,
        config
    },
    plugins: [
        pathify.plugin
    ]
});
