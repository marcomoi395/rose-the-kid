// eslint.config.js
const globals = require('globals');
const pluginJs = require('@eslint/js');
const prettier = require('eslint-config-prettier');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
    {
        ignores: ['node_modules', 'dist', 'coverage'],
    },
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
        },
    },
    pluginJs.configs.recommended,
    prettier,
    {
        files: [
            '**/*.test.js',
            'test/**/*.js',
            'test/setup.js',
            '**/__tests__/**/*.js',
            '**/jest.setup.js',
        ],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
    {
        rules: {
            'no-console': 'off',
            'no-underscore-dangle': 'off',
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            'jest/no-conditional-expect': 'off',
        },
    },
];
