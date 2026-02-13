const baseConfig = require("../../tooling/jest.base.cjs");

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: "pyasic-bridge-client",
  rootDir: __dirname,
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["<rootDir>/**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@/(.*)$": "<rootDir>/$1",
  },
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 30,
      lines: 30,
      statements: 35,
    },
  },
  collectCoverageFrom: [
    "<rootDir>/src/**/*.ts",
    "!<rootDir>/src/**/*.test.ts",
    "!<rootDir>/src/**/*.d.ts",
  ],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
};
