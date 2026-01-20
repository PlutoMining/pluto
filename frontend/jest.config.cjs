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
    '<rootDir>/src/hooks/**/*.{ts,tsx}',
    '<rootDir>/src/lib/**/*.{ts,tsx}',
    '<rootDir>/src/utils/**/*.{ts,tsx}',
    '<rootDir>/src/providers/**/*.{ts,tsx}',
    '<rootDir>/src/app/api/**/*.{ts,tsx}',
    '<rootDir>/src/pages/api/**/*.ts',
    '<rootDir>/src/components/**/*.{ts,tsx}',
    '!<rootDir>/src/components/**/index.ts',
  ],
  coveragePathIgnorePatterns: ['<rootDir>/src/app/(?!api)', '<rootDir>/src/theme/'],
  coverageThreshold: {
    global: {
      statements: 90,
      lines: 90,
      functions: 90,
      branches: 80,
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
