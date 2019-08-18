import {make} from 'vuex-pathify'
import FileItem from '@/model/FileItem'

let _recentlyPlayedFileItems = {};

const state = {
    playedFileItemId: null,
    seekPercentage: 0
};

export default {
    namespaced: true,
    state,
    getters: {
        playedFileItem: state => _recentlyPlayedFileItems[state.playedFileItemId]
    },
    mutations: make.mutations(state),
    actions: {
        setPlayedFileItem({commit}, fileItem) {
            let itemId = fileItem && fileItem.id;
            if (itemId) {
                if (!(fileItem instanceof FileItem)) {
                    throw new Error('invalid file item: ' + fileItem);
                }
                _recentlyPlayedFileItems[itemId] = fileItem;
            }
            commit('SET_PLAYED_FILE_ITEM_ID', itemId || null);
        }
    }
}
