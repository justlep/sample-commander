module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2017
    },
    env: {
        browser: true,
        node: true,
        es6: true
    },
    extends: [
        //'plugin:vue/essential',
        'eslint:recommended'
    ],
    globals: {
        __static: true
    },
    plugins: [
        'html'
    ],
    'rules': {
        'no-unused-vars': 1,
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'comma-dangle': ['error'],
        // allow paren-less arrow functions
        'arrow-parens': 0,
        // allow async-await
        'generator-star-spacing': 0,
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
        'space-before-function-paren': 0,
        'semi': 0,
        'no-multiple-empty-lines': 0,
        'object-curly-spacing': 0,
        'no-trailing-spaces': 0,
        'indent': 'off'
        //,'vue/script-indent': ['warn', 4, {baseIndent: 1}]
    }
};
