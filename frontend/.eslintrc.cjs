const path = require('path');
const baseConfig = require('../tooling/eslint.base.cjs');

module.exports = {
  ...baseConfig,
  root: true,
  extends: [...baseConfig.extends, "next/core-web-vitals"],
  parserOptions: {
    ...baseConfig.parserOptions,
    project: path.resolve(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
  },
  env: {
    ...baseConfig.env,
    browser: true,
  },
};
