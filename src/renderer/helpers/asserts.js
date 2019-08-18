
const {format} = require('util');

function _throwError([errorMsg, ...errorArgs]) {
    throw new Error( format(errorMsg || 'Assertion failed', ...errorArgs) );
}

export default {
    assert: function(expr, ...msgArgs) {
        expr || _throwError(msgArgs);
    },
    assertDefined: function(expr, ...msgArgs) {
        (typeof expr !== 'undefined') || _throwError(msgArgs);
    },
    assertBoolean: function(expr, ...msgArgs) {
        (typeof expr === 'boolean') || _throwError(msgArgs);
    },
    assertBooleanOrUndefined: function(expr, ...msgArgs) {
        (typeof expr === 'boolean' || typeof expr === 'undefined') || _throwError(msgArgs);
    },
    assertString: function(expr, ...msgArgs) {
        (typeof expr === 'string') || _throwError(msgArgs);
    },
    assertNonEmptyString: function(expr, ...msgArgs) {
        (expr && (typeof expr === 'string')) || _throwError(msgArgs);
    },
    assertStringOrEmpty: function(expr, ...msgArgs) {
        (!expr || typeof expr === 'string') || _throwError(msgArgs);
    },
    assertNumber: function(expr, ...msgArgs) {
        (typeof expr === 'number') || _throwError(msgArgs);
    },
    assertNumberInRange: function(expr, min, max, ...msgArgs) {
        (typeof expr === 'number' && expr >= min && expr <= max) || _throwError(msgArgs);
    },
    assertNumberInRangeOrEmpty: function(expr, min, max, ...msgArgs) {
        (!expr || (typeof expr === 'number' && expr >= min && expr <= max)) || _throwError(msgArgs);
    },
    assertFunction: function(expr, ...msgArgs) {
        (typeof expr === 'function') || _throwError(msgArgs);
    },
    assertFunctionOrEmpty: function(expr, ...msgArgs) {
        (!expr || (typeof expr === 'function')) || _throwError(msgArgs);
    },
    assertObject: function(expr, ...msgArgs) {
        (expr && typeof expr === 'object') || _throwError(msgArgs);
    },
    assertObjectOrEmpty: function(expr, ...msgArgs) {
        (!expr || (typeof expr === 'object')) || _throwError(msgArgs);
    },
    assertArray: function(expr, ...msgArgs) {
        (expr && Array.isArray(expr)) || _throwError(msgArgs);
    },
    assertArrayOrEmpty: function(expr, ...msgArgs) {
        (!expr || expr instanceof Array) || _throwError(msgArgs);
    },
    assertElement: function(expr, ...msgArgs) {
        (expr && expr.nodeType === 1) || _throwError(msgArgs);
    }
}
