// Mock dotenv
const mockDotenvConfig = jest.fn();
jest.mock('dotenv', () => ({
  config: mockDotenvConfig
}));

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn()
  }
}));

describe('Cloudinary Middleware', () => {
  let originalEnv;
  let cloudinary;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Set up test environment variables
    process.env.CLOUD_NAME = 'test-cloud';
    process.env.API_KEY = 'test-api-key';
    process.env.API_SECRET = 'test-api-secret';
    
    // Clear mocks
    mockDotenvConfig.mockClear();
    const cloudinaryV2 = require('cloudinary').v2;
    cloudinaryV2.config.mockClear();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should configure cloudinary with environment variables', () => {
      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: 'test-cloud',
        api_key: 'test-api-key',
        api_secret: 'test-api-secret'
      });
    });

    it('should load environment variables from config/.env', () => {
      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      expect(mockDotenvConfig).toHaveBeenCalledWith({ path: './config/.env' });
    });

    it('should handle missing environment variables', () => {
      // Remove environment variables
      delete process.env.CLOUD_NAME;
      delete process.env.API_KEY;
      delete process.env.API_SECRET;

      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: undefined,
        api_key: undefined,
        api_secret: undefined
      });
    });

    it('should handle empty environment variables', () => {
      // Set empty environment variables
      process.env.CLOUD_NAME = '';
      process.env.API_KEY = '';
      process.env.API_SECRET = '';

      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: '',
        api_key: '',
        api_secret: ''
      });
    });

    it('should handle numeric environment variables', () => {
      // Set numeric environment variables
      process.env.CLOUD_NAME = '123';
      process.env.API_KEY = '456';
      process.env.API_SECRET = '789';

      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: '123',
        api_key: '456',
        api_secret: '789'
      });
    });
  });

  describe('Export', () => {
    it('should export cloudinary instance', () => {
      const cloudinaryInstance = require('../../../middleware/cloudinary');
      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryInstance).toBe(cloudinaryV2);
    });

    it('should export the same instance on multiple requires', () => {
      const instance1 = require('../../../middleware/cloudinary');
      const instance2 = require('../../../middleware/cloudinary');
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Environment variable handling', () => {
    it('should handle special characters in environment variables', () => {
      process.env.CLOUD_NAME = 'test-cloud-name';
      process.env.API_KEY = 'test-api-key-123';
      process.env.API_SECRET = 'test-api-secret-456';

      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: 'test-cloud-name',
        api_key: 'test-api-key-123',
        api_secret: 'test-api-secret-456'
      });
    });

    it('should handle very long environment variables', () => {
      const longValue = 'a'.repeat(1000);
      process.env.CLOUD_NAME = longValue;
      process.env.API_KEY = longValue;
      process.env.API_SECRET = longValue;

      // Re-require to trigger configuration
      jest.resetModules();
      cloudinary = require('../../../middleware/cloudinary');

      const cloudinaryV2 = require('cloudinary').v2;
      
      expect(cloudinaryV2.config).toHaveBeenCalledWith({
        cloud_name: longValue,
        api_key: longValue,
        api_secret: longValue
      });
    });
  });

  describe('Module loading', () => {
    it('should load cloudinary module correctly', () => {
      const cloudinaryModule = require('cloudinary');
      
      expect(cloudinaryModule).toBeDefined();
      expect(cloudinaryModule.v2).toBeDefined();
      expect(typeof cloudinaryModule.v2.config).toBe('function');
    });

    it('should load dotenv module correctly', () => {
      const dotenvModule = require('dotenv');
      
      expect(dotenvModule).toBeDefined();
      expect(typeof dotenvModule.config).toBe('function');
    });
  });
}); 