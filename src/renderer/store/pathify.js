/**
 * Custom-configured vuex-pathify to be imported by the stores,
 * as described here: https://davestewart.github.io/vuex-pathify/#/setup/config
 */

import pathify from 'vuex-pathify'

Object.assign(pathify.options, {
    mapping: 'standard',  // map states to store members using the "standard" scheme
    strict: true,         // throw an error if the store member cannot be found
    cache: true,          // cache generated functions for faster re-use
    deep: true            // allow sub-property access to Vuex stores
});

export default pathify
