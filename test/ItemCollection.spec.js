import ItemCollection from '@/helpers/ItemCollection'

describe('ItemCollection', () => {

    it('can wrap & unwrap a array of whatever', () => {
        const obj = {name: 'huhu'},
              obj2 = {name: 'foo'};

        let coll = new ItemCollection([obj, obj2]);
        expect(Array.isArray(coll.getItems())).toBe(true);
        expect(coll.getItems()[0]).toBe(obj);
        expect(coll.getItems()[1]).toBe(obj2);


        const arr = [obj, obj2];

        let coll2 = ItemCollection.from(arr);
        expect(Array.isArray(coll.getItems())).toBe(true);
        expect(coll2.getItems()[0]).toBe(obj);
        expect(coll2.getItems()[1]).toBe(obj2);
    });

    it('contains an empty array if created with no/falsy constructor argument', () => {
        let items = new ItemCollection().getItems(); 
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBe(0);

        let items2 = new ItemCollection(false).getItems(); 
        expect(Array.isArray(items2)).toBe(true);
        expect(items2.length).toBe(0);
    });
    
});
