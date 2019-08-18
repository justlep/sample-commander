const SYM = Symbol();

/**
 * A simple wrapper for any object, to be used in components data or store state while
 * preventing Vue from making the items items reactive.
 */
export default class ItemWrapper {
    constructor(item) {
        this[SYM] = item;
    }
    getItem() {
        return this[SYM];
    }
}
