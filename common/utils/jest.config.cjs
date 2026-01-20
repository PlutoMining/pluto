const baseConfig = require('../../tooling/jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'common-utils',
  rootDir: __dirname,
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '<rootDir>/*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.test.ts',
    '!<rootDir>/dist/**',
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      lines: 100,
      functions: 100,
      branches: 100,
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
