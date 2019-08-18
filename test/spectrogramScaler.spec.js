
import {getCanvasFilterExpression} from '@/processing/spectrogramScaler'

describe('spectrogramScaler', () => {
   
    it('can calculate a filter expression for brightness/saturation adjustments', () => {
        expect(() => getCanvasFilterExpression('0', '0')).toThrow();
        expect(() => getCanvasFilterExpression(-0.1, -1)).toThrow();
        expect(() => getCanvasFilterExpression(0, 0)).toThrow();
        
        expect(getCanvasFilterExpression(0.23, 0.67)).toEqual('saturate(23%) brightness(67%)'); 
        expect(getCanvasFilterExpression(1, 1)).toEqual('saturate(100%) brightness(100%)'); 
        expect(getCanvasFilterExpression(1.23, 1.45)).toEqual('saturate(123%) brightness(145%)'); 
    });
    
});
