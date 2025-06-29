module.exports = {
  // Load test environment variables
  setupFilesAfterEnv: ['<rootDir>/test/setup/setup.js'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Coverage settings
  collectCoverage: false,
  
  // Test timeout
  testTimeout: 15000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Force exit after tests
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/config/database.test.js'  // This is a utility file, not a test file
  ]
}; 