const SYM_ITEM = Symbol();
const SYM_PENDING = Symbol();
const SYM_PROCESSING = Symbol();
const SYM_PROCESSED = Symbol();
const SYM_CHECKBOX_ID = Symbol('_checkboxId');

let _checkboxCounter = 0;

/**
 * A simple wrapper for any object, to be used in components data or store state while
 * preventing Vue from making the items items reactive.
 */
export default class ProcessableItemWrapper {
    constructor(item) {
        this[SYM_ITEM] = item;
        this[SYM_CHECKBOX_ID] = `_piw_cb__${++_checkboxCounter}`; 
        this.statusSymOrError = SYM_PENDING;
        this.isIncluded = true;
    }
    get checkboxId() {
        return this[SYM_CHECKBOX_ID];
    }
    get item() {
        return this[SYM_ITEM]; 
    }
    get isPending() {
        return this.statusSymOrError === SYM_PENDING; 
    }
    get isProcessed() {
        return this.statusSymOrError === SYM_PROCESSED; 
    }
    setProcessed() {
        this.statusSymOrError = SYM_PROCESSED;
    }
    get isProcessing() {
        return this.statusSymOrError === SYM_PROCESSING; 
    }
    setProcessing() {
        this.statusSymOrError = SYM_PROCESSING;
    }
    get error() {
        return (typeof this.statusSymOrError === 'symbol') ? '' : this.statusSymOrError; 
    }
    set error(err) {
        if (typeof err === 'symbol') {
            throw new Error('Error must not be a symbol');
        }
        this.statusSymOrError = err;
    }
}
