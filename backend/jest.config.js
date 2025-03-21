export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  // For ES modules support
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Collect coverage data from your source files
  collectCoverageFrom: ['src/**/*.js', '!src/**/__tests__/**'],
};
