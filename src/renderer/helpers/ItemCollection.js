const SYM = Symbol();

/**
 * A simple wrapper for any array of objects, to be used in components data or store state while
 * preventing Vue from making the items themselves reactive.
 */
export default class ItemCollection {
    static from(items) {
        return new ItemCollection(items);
    }
    
    constructor(items) {
        this[SYM] = items || [];
    }
    getItems() {
        return this[SYM];
    }
}
