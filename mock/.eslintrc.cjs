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
};

