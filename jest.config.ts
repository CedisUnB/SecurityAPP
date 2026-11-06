import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const baseConfig: Config = {
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@generated/(.*)$': '<rootDir>/generated/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};

export default async function jestConfig(): Promise<Config> {
  const nextConfig = await createJestConfig(baseConfig)();

  return {
    ...nextConfig,
    testPathIgnorePatterns: ['./tests/e2e'],
    projects: [
      {
        ...nextConfig,
        displayName: 'unit',
        testEnvironment: 'jsdom',
        roots: ['<rootDir>/src/app', '<rootDir>/src'],
        testPathIgnorePatterns: ['./tests/e2e', './tests/integration'],
      },
      {
        ...nextConfig,
        displayName: 'integration',
        testEnvironment: 'node',
        roots: ['<rootDir>/tests/integration'],
        setupFiles: ['dotenv/config'],
        testPathIgnorePatterns: ['./tests/e2e'],
      },
    ],
  };
}