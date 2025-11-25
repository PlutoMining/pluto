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
  },
  collectCoverageFrom: [
    '<rootDir>/src/utils/formatTime.ts',
    '<rootDir>/src/utils/minerMap.ts',
    '<rootDir>/src/providers/**/*.{ts,tsx}',
    '<rootDir>/src/app/api/**/*.{ts,tsx}',
  ],
  coveragePathIgnorePatterns: ['<rootDir>/src/app/(?!api)', '<rootDir>/src/theme/'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
};

