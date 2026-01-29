const path = require('path');
const baseConfig = require('../tooling/eslint.base.cjs');

module.exports = {
  ...baseConfig,
  root: true,
  parserOptions: {
    ...baseConfig.parserOptions,
    project: path.resolve(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
  },
  overrides: [
    ...(baseConfig.overrides || []),
    {
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
