const baseConfig = require('../tooling/jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'discovery',
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    '<rootDir>/src/services/**/*.ts',
    '<rootDir>/src/controllers/**/*.ts',
    '<rootDir>/src/routes/**/*.ts',
    '<rootDir>/src/config/**/*.ts',
    '!<rootDir>/src/index.ts',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/src/services/arpScanWrapper.ts',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  coverageThreshold: {
    global: {
      statements: 95,
      lines: 95,
      functions: 95,
      branches: 80,
    },
  },
};
