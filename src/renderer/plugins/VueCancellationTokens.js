import { CancellationTokenFactory } from '@/processing/CancellationTokenFactory'

/**
 * @type {Object<string, CancellationTokenFactory>}
 * @private
 */
let _factoryByName = {};

const DEFAULT_FACTORY_NAME = 'SHARED_DEFAULT';

/**
 * @param {string} factoryName
 * @returns {CancellationTokenFactory|}
 * @private
 */
function _getOrCreateFactory(factoryName) {
    if (!factoryName || typeof factoryName !== 'string') {
        throw new Error('Invalid name for CancellationTokenFactory: ' + factoryName);
    }
    // if (!_factoryByName[factoryName]) {
    //     console.warn('Created new CancellationTokenFactory: ' + factoryName);
    // }
    return _factoryByName[factoryName] || (_factoryByName[factoryName] = new CancellationTokenFactory());
}

export default {
    install(Vue) {
        /**
         * @param {string} [factoryName] - by the default, the globally shared token factory is used
         * @returns {CancellationToken}
         */
        Vue.prototype.$createCancellationToken = function(factoryName = DEFAULT_FACTORY_NAME) {
            return _getOrCreateFactory(factoryName).newToken(); 
        };

        /**
         * @param {string} [factoryName] - by the default, the globally shared token factory is used
         */
        Vue.prototype.$cancelCancellationToken = function(factoryName = DEFAULT_FACTORY_NAME) {
            return _getOrCreateFactory(factoryName).newToken();
        };
    }
}
