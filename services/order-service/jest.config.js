module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/middleware/**/*.js',
    'src/services/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    './src/controllers/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
};
