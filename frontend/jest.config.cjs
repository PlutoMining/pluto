const baseConfig = require('../tooling/jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'frontend',
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/jest/styleMock.js',
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}', '!<rootDir>/src/**/*.d.ts', '!<rootDir>/src/__tests__/**'],
  coverageThreshold: {
    global: {
      statements: 100,
      lines: 100,
      functions: 100,
      branches: 100,
    },
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
};
