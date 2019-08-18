import Logger from '@/helpers/Logger'

/**
 * Adds global event-bus-like eventing to Vue's prototype, 
 * so it's accessible to all components, independent from their nesting.
 * 
 * Also, default mode is `strict`, meaning that only such events can be emitted or listened to
 * which have been explicitly registered beforehand. This mitigates the downside of
 * using "magic strings" for event names instead of constants that need to be imported to respective components.
 * (Useful at least in the Electron context where event names aren't usually added/removed dynamically.
 *  In regular webapps, however, constants should be used at all times!)
 * 
 * Usage: 
 *   
 *   (1) Register plugin with Vue:
 *          import VueGlobalEvents from 'VueGlobalEvents'
 *          Vue.use(VueGlobalEvents, { events: ['my-event1', 'event2'], strict: true });
 *          
 *   (2) If needed, register more allowed events dynamically inside any Component:
 *          this.$registerGlobalEvents('event4', 'event5', ...);
 *          
 *   (3) Inside any component, bind event handlers (e.g. in the `created` hook):
 *          this.$onGlobal('event4', (payload) => console.log('got %o', payload) );
 *   
 *   (4) Inside any component, emit global events 
 *          this.$emitGlobal('event4', 'some string payload');
 *          
 *
 * @author Lennart Pegel
 * @licence MIT 
 */
export default {
    install(Vue, opts = {strict: true, events: []}) {
        const BOUND_HANDLERS_SYM = Symbol('BOUND_GLOBAL_HANDLERS');
        const _eventBus = new Vue();
        const _allowedEventNames = (opts.strict !== false) ? {} : null;

        /**
         * @this {Component}
         * @private
         */
        const _cleanupHandlersForComponent = function() {
            // Logger.dev('Purging global event handlers for component %o', this);
            let handlerMap = this[BOUND_HANDLERS_SYM] || {};
            Object.keys(handlerMap).forEach(eventName => {
                for (let eventHandler of handlerMap[eventName]) {
                    // Logger.dev('Removing handler for global event "%s" from %o', eventName, this);
                    _eventBus.$off(eventName, eventHandler);
                }
            });
            delete this[BOUND_HANDLERS_SYM];
        };

        /**
         * @param {function} nativeMethod - the eventBus object's native $on, $off.. etc methods
         * @param {boolean} [isAddingNewHandler] - true meaning the `nativeMethod` adds event handlers that need to be removed 
         *                                         by {@link _cleanupHandlersForComponent} when the component gets destroyed  
         * @returns {*}
         * @private
         */
        const _proxy = (nativeMethod, isAddingNewHandler) => function(eventName, eventHandler) {
                if (_allowedEventNames && typeof eventName === 'string' && !_allowedEventNames[eventName]) {
                    throw new Error(`Event "${eventName}" is not registered. Use vm.$registerGlobalEvent(event1, ...)`);
                }

                let removableEventHandler = isAddingNewHandler && (typeof eventHandler === 'function') && eventHandler;
                if (removableEventHandler) {
                    /** @type {Object<string, Function[]>} */ 
                    let boundHandlersByEventName = this[BOUND_HANDLERS_SYM];
                    if (!boundHandlersByEventName) {
                        boundHandlersByEventName = (this[BOUND_HANDLERS_SYM] = {});
                        this.$once('hook:beforeDestroy', _cleanupHandlersForComponent);
                    }
                    let handlers = boundHandlersByEventName[eventName] || (boundHandlersByEventName[eventName] = []);
                    handlers[handlers.length] = eventHandler;
                    // Logger.dev('added global "%s" event handler to component %s -> this = %o', 
                    //     eventName, this.$vnode.tag.replace(/.*-\d+-/,''), this);
                }

                return nativeMethod.apply(_eventBus, arguments);
            };

        Vue.prototype.$onGlobal = _proxy(_eventBus.$on, true);
        Vue.prototype.$onceGlobal = _proxy(_eventBus.$once, true);
        Vue.prototype.$offGlobal = _proxy(_eventBus.$off, false);
        Vue.prototype.$emitGlobal = _proxy(_eventBus.$emit, false);

        /**
         * Registers global events to be accepted in strict mode.
         * @param {string} names
         */
        Vue.prototype.$registerGlobalEvents = (...names) => {
            names.forEach(eventName => {
                if (_allowedEventNames[eventName]) {
                    Logger.warn(`Global event name "${eventName}" is already defined`);
                }
                _allowedEventNames[eventName] = true;
            });
        };
        
        if (Array.isArray(opts.events)) {
            Vue.prototype.$registerGlobalEvents(...opts.events);
        }
    }
}
