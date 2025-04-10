export default {
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'ts', 'json'],
  // For ES modules support
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  // Collect coverage data from your source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/config/env.ts',
    '!src/app.ts',
    '!src/config/config.ts',
    '!src/types/**',
    '!dist/**',
  ],
  // Exclude paths from test discovery entirely
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
