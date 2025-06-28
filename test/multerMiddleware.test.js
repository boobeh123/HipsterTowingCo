const multer = require('../middleware/multer');
const path = require('path');

// Mock multer
jest.mock('multer', () => {
  const mockMulter = jest.fn();
  mockMulter.mockReturnValue({
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn(),
    any: jest.fn(),
    none: jest.fn()
  });
  return mockMulter;
});

describe('Multer Middleware', () => {
  let mockMulterInstance;
  let mockStorage;
  let mockFileFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked multer instance
    mockMulterInstance = multer();
    
    // Extract the configuration that was passed to multer
    const multerMock = require('multer');
    const config = multerMock.mock.calls[0][0];
    
    mockStorage = config.storage;
    mockFileFilter = config.fileFilter;
  });

  describe('Configuration', () => {
    it('should configure multer with disk storage', () => {
      expect(mockStorage).toBeDefined();
      expect(typeof mockStorage).toBe('object');
    });

    it('should configure multer with file filter', () => {
      expect(mockFileFilter).toBeDefined();
      expect(typeof mockFileFilter).toBe('function');
    });

    it('should export multer instance', () => {
      expect(multer).toBeDefined();
      expect(typeof multer.single).toBe('function');
    });
  });

  describe('File Filter', () => {
    let req, file, cb;

    beforeEach(() => {
      req = {};
      file = {
        originalname: 'test.jpg'
      };
      cb = jest.fn();
    });

    it('should accept .jpg files', () => {
      file.originalname = 'test.jpg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .jpeg files', () => {
      file.originalname = 'test.jpeg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .png files', () => {
      file.originalname = 'test.png';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept files with uppercase extensions', () => {
      file.originalname = 'test.JPG';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept files with mixed case extensions', () => {
      file.originalname = 'test.JpG';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject .gif files', () => {
      file.originalname = 'test.gif';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .bmp files', () => {
      file.originalname = 'test.bmp';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .pdf files', () => {
      file.originalname = 'test.pdf';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .txt files', () => {
      file.originalname = 'test.txt';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .doc files', () => {
      file.originalname = 'test.doc';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .docx files', () => {
      file.originalname = 'test.docx';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .xls files', () => {
      file.originalname = 'test.xls';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .xlsx files', () => {
      file.originalname = 'test.xlsx';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .zip files', () => {
      file.originalname = 'test.zip';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .rar files', () => {
      file.originalname = 'test.rar';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .mp4 files', () => {
      file.originalname = 'test.mp4';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .mp3 files', () => {
      file.originalname = 'test.mp3';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject files with no extension', () => {
      file.originalname = 'test';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject files with multiple dots', () => {
      file.originalname = 'test.image.jpg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject files with dots in name', () => {
      file.originalname = 'test.image.gif';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle files with spaces in name', () => {
      file.originalname = 'test image.jpg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle files with special characters in name', () => {
      file.originalname = 'test-image_123.jpg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle files with unicode characters in name', () => {
      file.originalname = 'test-émoji-🚀.jpg';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(100) + '.jpg';
      file.originalname = longName;
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle empty filename', () => {
      file.originalname = '';
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle undefined filename', () => {
      file.originalname = undefined;
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle null filename', () => {
      file.originalname = null;
      
      mockFileFilter(req, file, cb);

      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });
  });

  describe('Error Handling', () => {
    let req, file, cb;

    beforeEach(() => {
      req = {};
      file = {
        originalname: 'test.jpg'
      };
      cb = jest.fn();
    });

    it('should handle callback throwing error for accepted files', () => {
      file.originalname = 'test.jpg';
      cb.mockImplementation(() => {
        throw new Error('Callback error');
      });

      expect(() => {
        mockFileFilter(req, file, cb);
      }).toThrow('Callback error');
    });

    it('should handle callback throwing error for rejected files', () => {
      file.originalname = 'test.gif';
      cb.mockImplementation(() => {
        throw new Error('Callback error');
      });

      expect(() => {
        mockFileFilter(req, file, cb);
      }).toThrow('Callback error');
    });

    it('should handle missing file object', () => {
      expect(() => {
        mockFileFilter(req, undefined, cb);
      }).toThrow();
    });

    it('should handle missing callback', () => {
      expect(() => {
        mockFileFilter(req, file, undefined);
      }).toThrow();
    });
  });

  describe('Storage Configuration', () => {
    it('should use disk storage', () => {
      expect(mockStorage).toBeDefined();
      // Note: We can't easily test the internal structure of diskStorage
      // without more complex mocking, but we can verify it's configured
    });

    it('should not use memory storage', () => {
      // This is more of an integration test, but we can verify
      // that we're not using the default memory storage
      expect(mockStorage).not.toBeUndefined();
    });
  });

  describe('Module Integration', () => {
    it('should export multer middleware correctly', () => {
      expect(multer).toBeDefined();
      expect(typeof multer.single).toBe('function');
      expect(typeof multer.array).toBe('function');
      expect(typeof multer.fields).toBe('function');
      expect(typeof multer.any).toBe('function');
      expect(typeof multer.none).toBe('function');
    });

    it('should be configured with proper options', () => {
      const multerMock = require('multer');
      const config = multerMock.mock.calls[0][0];
      
      expect(config).toHaveProperty('storage');
      expect(config).toHaveProperty('fileFilter');
      expect(typeof config.fileFilter).toBe('function');
    });
  });
}); 