import {make} from 'vuex-pathify';
import {DUPLICATE_MODE} from '@/constants'

const state = {
    filter: '',
    duplicateMode: DUPLICATE_MODE.ALL,
    isSourceLoading: false,
    isSourceLoaded: false,
    isTargetLoading: false,
    isTargetLoaded: false
};

export default {
    namespaced: true,
    state,
    getters: {
        duplicateModeId: state => state.duplicateMode.id,
        filterLowercase: state => (state.filter || '').toLowerCase()
    },
    mutations: {
        ...make.mutations(state)
    }
}
