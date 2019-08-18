import {CancellationTokenFactory} from '@/processing/CancellationTokenFactory'

describe('CancellationTokenFactory', () => {
   
    it('creates cancellable tokens', () => {
        let factory = new CancellationTokenFactory(),
            token1 = factory.newToken();
        
        // explict cancelling
        expect(token1.isCancelled()).toBe(false);
        token1.cancel();
        expect(token1.isCancelled()).toBe(true);
        
        // creating new tokens implicitly cancels the previous one
        let token2 = factory.newToken();
        expect(token2.isCancelled()).toBe(false);
        let token3 = factory.newToken();
        expect(token2.isCancelled()).toBe(true);
        expect(token3.isCancelled()).toBe(false);
    });
    
    it('creates tokens which are independent from other factory instances', () => {
        let factory1 = new CancellationTokenFactory(),
            factory2 = new CancellationTokenFactory();
        
        let f1Token1 = factory1.newToken();
        expect(f1Token1.isCancelled()).toBe(false);
        let f2Token1 = factory2.newToken();
        expect(f1Token1.isCancelled()).toBe(false);
        expect(f2Token1.isCancelled()).toBe(false);
        let f1Token2 = factory1.newToken();
        expect(f1Token2.isCancelled()).toBe(false);
        expect(f1Token1.isCancelled()).toBe(true);
        expect(f2Token1.isCancelled()).toBe(false);
        
        factory1.cancelCurrentToken();
        expect(f1Token2.isCancelled()).toBe(true);
        expect(f2Token1.isCancelled()).toBe(false);
        
        let f1Token3 = factory1.newToken();
        factory1.cancelToken(f1Token2); // that token is already invalid, anyway
        expect(f1Token3.isCancelled()).toBe(false);
        factory2.cancelToken(f1Token3); // that token does not belong to factory2, so the request is ignored
        expect(f1Token3.isCancelled()).toBe(false);
        factory1.cancelToken(f1Token3); // now token3 gets cancelled by its factory 
        expect(f1Token3.isCancelled()).toBe(true);
        
        let f1Token4 = factory1.newToken(),
            f2Token2 = factory2.newToken();
        
        expect(factory1.isTokenActive(f1Token4)).toBe(true);
        expect(factory1.isTokenActive(f2Token2)).toBe(false);
        expect(factory2.isTokenActive(f1Token4)).toBe(false);
        expect(factory2.isTokenActive(f2Token2)).toBe(true);
        
        factory1.cancelCurrentToken();
        expect(factory1.isTokenActive(f1Token4)).toBe(false);
        
        factory2.cancelCurrentToken();
        expect(factory2.isTokenActive(f2Token2)).toBe(false);
    });
});
