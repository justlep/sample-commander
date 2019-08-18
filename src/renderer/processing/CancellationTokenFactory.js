
const NO_TOKEN = Symbol();

/**
 * A token that can be passed to asynchronous task queues to allow signalling them
 * that task processing should be stopped (cancelled) prematurely.
 * Only ONE token from the same {@link CancellationTokenFactory} is valid (in non-cancelled state) at a time.
 */
class CancellationToken {
    /**
     * @param {CancellationTokenFactory} factory
     */
    constructor(factory) {
        this._factory = factory;
    }

    /**
     * @returns {boolean}
     */
    isCancelled() {
        return !this._factory.isTokenActive(this);
    }
    
    cancel() {
        this._factory.cancelToken(this);
    }
}

/**
 * A Factory producing {@link CancellationToken} instances.
 * Only ONE token is valid (i.e. in non-cancelled state) at a time.
 * Generating a new token automatically cancels the previous one.
 */
export class CancellationTokenFactory {
    
    constructor() {
        this._activeToken = NO_TOKEN;
    }

    /**
     * Creates a new token, implicitly cancelling the previously active token.
     * @returns {CancellationToken}
     */
    newToken() {
        this._activeToken = new CancellationToken(this);
        return this._activeToken;
    }

    /**
     * Invalidates the currently active token. 
     */
    cancelCurrentToken() {
        this._activeToken = NO_TOKEN;
    }

    /**
     * Invalidates the given token if it is currently active.
     * @param {CancellationToken} token
     */
    cancelToken(token) {
        this.isTokenActive(token) && this.cancelCurrentToken();
    }
    
    /**
     * @param {*} token
     * @returns {boolean}
     */
    isTokenActive(token) {
        return token === this._activeToken;
    }
}
