import Vue from 'vue'

import store from './store'
import VueGlobalEvents from '@/plugins/VueGlobalEvents'
import VueAsserts from '@/plugins/VueAsserts'
import VueCancellationTokens from '@/plugins/VueCancellationTokens'
import { GLOBAL_EVENTS } from './constants'

import 'typeface-cousine/index.css'
import 'typeface-roboto/index.css'

import Buefy from 'buefy'
import VueDarkMode from 'vuedarkmode'
import Logger from '@/helpers/Logger'
import Mousetrap from 'mousetrap'

import '@fortawesome/fontawesome-free/css/all.css'
//import 'buefy/dist/buefy.css'
import '@/styles/app.scss'
import 'bulma-slider/dist/css/bulma-slider.min.css'

if (!process.env.IS_WEB) {
    Vue.use(require('vue-electron'))
}
Vue.config.productionTip = false;

Logger.setLogLevel(process.env.NODE_ENV !== 'production' ? Logger.LEVEL.DEBUG : Logger.LEVEL.OFF);
Vue.prototype.$log = Logger;

// add + init mousetrap...
Vue.prototype.$mousetrap = new Mousetrap();
Vue.prototype.$mousetrap.stopCallback = function(e, element, combo) {
    // if the element has the class "mousetrap" then no need to stop
    if (combo === 'esc' || (' ' + element.className + ' ').includes(' mousetrap ')) {
        return false;
    }
    
    // stop for input, select, and textarea
    return element.matches('input[type=text],input[type=search],textarea,select') || (element.contentEditable && element.contentEditable === 'true');
};

/**
 * @returns {boolean} - true if a modal dialog is currently displayed
 */
Vue.prototype.$isModalDialogVisible = () => !!document.querySelector('.modal.is-active');

Vue.use(Buefy);
Vue.use(VueDarkMode);

Vue.use(VueGlobalEvents, { events: GLOBAL_EVENTS });
Vue.use(VueAsserts);
Vue.use(VueCancellationTokens);

import App from './App'

/* eslint-disable no-new */
new Vue({
    components: { 
        App
    },
    store,
    template: '<App></App>'
}).$mount('#app');
