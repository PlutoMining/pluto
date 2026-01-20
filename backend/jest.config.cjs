const baseConfig = require('../tooling/jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'backend',
  rootDir: __dirname,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/**/*.spec.ts',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      statements: 100,
      lines: 100,
      functions: 100,
      branches: 100,
    },
  },
};
