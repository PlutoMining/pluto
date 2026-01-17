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
  coveragePathIgnorePatterns: [
    '<rootDir>/src/index.ts',
    '<rootDir>/src/config/',
    '<rootDir>/src/routes/',
    '<rootDir>/src/services/tracing.service.ts',
  ],
};
