
import asserts from '@/helpers/asserts'

export default {
    install(Vue) {
        Object.assign(Vue.prototype, {
            $assert: asserts.assert,
            $assertDefined: asserts.assertDefined,
            $assertBoolean: asserts.assertBoolean,
            $assertBooleanOrUndefined: asserts.assertBooleanOrUndefined,
            $assertString: asserts.assertString,
            $assertNonEmptyString: asserts.assertNonEmptyString,
            $assertStringOrEmpty: asserts.assertStringOrEmpty,
            $assertNumber: asserts.assertNumber,
            $assertNumberInRange: asserts.assertNumberInRange,
            $assertNumberInRangeOrEmpty: asserts.assertNumberInRangeOrEmpty,
            $assertFunction: asserts.assertFunction,
            $assertFunctionOrEmpty: asserts.assertFunctionOrEmpty,
            $assertObject: asserts.assertObject,
            $assertObjectOrEmpty: asserts.assertObjectOrEmpty,
            $assertArray: asserts.assertArray,
            $assertArrayOrEmpty: asserts.assertArrayOrEmpty,
            $assertElement: asserts.assertElement
        });
    }
}
