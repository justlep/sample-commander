import ProcessableItemWrapper from '@/helpers/ProcessableItemWrapper'

describe('ProcessableItemWrapper', () => {

    const ITEM = {name: 'huhu'};
    const ERROR = {foo: 'some error occurred'};
    
    it('holds an item and has a mutable state', () => {
        let wrapper = new ProcessableItemWrapper(ITEM);
        
        expect(wrapper.item).toBe(ITEM);
        expect(wrapper.isPending).toBe(true);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBeFalsy();
        
        wrapper.setProcessing();
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(true);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBeFalsy();

        wrapper.setProcessed();
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(true);
        expect(wrapper.error).toBeFalsy();
        
        wrapper.error = ERROR;
        expect(wrapper.isPending).toBe(false);
        expect(wrapper.isProcessing).toBe(false);
        expect(wrapper.isProcessed).toBe(false);
        expect(wrapper.error).toBe(ERROR);

        expect(wrapper.item).toBe(ITEM); // unchanged
    });

    it('can only change pending/processing/processed state via setters', () => {
        let wrapper = new ProcessableItemWrapper(ITEM);
        expect(wrapper.isProcessed).toBe(false);
        expect(() => wrapper.isPending = true).toThrow();
        expect(() => wrapper.isProcessing = true).toThrow();
        expect(() => wrapper.isProcessed = true).toThrow();
    });
    
    it('provides a unique checkboxId per wrapper for selecting/deselecting', () => {
        let wrapper1 = new ProcessableItemWrapper(ITEM),
            wrapper2 = new ProcessableItemWrapper(ITEM);

        expect(typeof wrapper1.checkboxId).toBe('string');
        expect(typeof wrapper2.checkboxId).toBe('string');
        expect(wrapper1.checkboxId).toBeTruthy();
        expect(wrapper2.checkboxId).toBeTruthy();
        expect(wrapper1.checkboxId).not.toEqual(wrapper2.checkboxId);
    });
});
