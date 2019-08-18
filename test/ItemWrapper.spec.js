import ItemWrapper from '@/helpers/ItemWrapper'

describe('ItemWrapper', () => {

    it('can wrap & unwrap items', () => {
        const obj = {name: 'huhu'};
        
        let wrapper = new ItemWrapper(obj);
        expect(wrapper.getItem()).toBe(obj);
    });

});
