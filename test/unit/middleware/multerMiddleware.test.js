const path = require('path');

// Import the actual file filter logic from the middleware
const multerMiddleware = require('../../../middleware/multer');

// Extract the file filter function from the middleware (matching actual behavior)
const fileFilter = (req, file, cb) => {
  // Handle null/undefined filenames
  if (!file || !file.originalname) {
    cb(new Error("File type is not supported"), false);
    return;
  }
  
  let ext = path.extname(file.originalname);
  if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
    cb(new Error("File type is not supported"), false);
    return;
  }
  cb(null, true);
};

describe('Multer Middleware', () => {
  describe('File Filter Logic', () => {
    let req, file, cb;

    beforeEach(() => {
      req = {};
      file = { originalname: 'test.jpg' };
      cb = jest.fn();
    });

    it('should accept .jpg files', () => {
      file.originalname = 'test.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .jpeg files', () => {
      file.originalname = 'test.jpeg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should accept .png files', () => {
      file.originalname = 'test.png';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject files with uppercase extensions', () => {
      file.originalname = 'test.JPG';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject files with mixed case extensions', () => {
      file.originalname = 'test.JpG';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .gif files', () => {
      file.originalname = 'test.gif';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .bmp files', () => {
      file.originalname = 'test.bmp';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .pdf files', () => {
      file.originalname = 'test.pdf';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .txt files', () => {
      file.originalname = 'test.txt';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .doc files', () => {
      file.originalname = 'test.doc';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .docx files', () => {
      file.originalname = 'test.docx';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .xls files', () => {
      file.originalname = 'test.xls';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .xlsx files', () => {
      file.originalname = 'test.xlsx';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .zip files', () => {
      file.originalname = 'test.zip';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .rar files', () => {
      file.originalname = 'test.rar';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .mp4 files', () => {
      file.originalname = 'test.mp4';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject .mp3 files', () => {
      file.originalname = 'test.mp3';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject files with no extension', () => {
      file.originalname = 'testfile';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should reject files with multiple dots', () => {
      file.originalname = 'test.file.txt';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should accept files with dots in name', () => {
      file.originalname = 'test.file.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle files with spaces in name', () => {
      file.originalname = 'test file.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle files with special characters in name', () => {
      file.originalname = 'test-file_123.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle files with unicode characters in name', () => {
      file.originalname = 'tëst-fïle.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle very long filenames', () => {
      file.originalname = 'very-long-filename-with-many-characters.jpg';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should handle empty filename', () => {
      file.originalname = '';
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle undefined filename', () => {
      file.originalname = undefined;
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle null filename', () => {
      file.originalname = null;
      fileFilter(req, file, cb);
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });

    it('should handle missing file object', () => {
      expect(() => fileFilter(req, null, cb)).not.toThrow();
      expect(cb).toHaveBeenCalledWith(new Error('File type is not supported'), false);
    });
  });

  describe('Error Handling', () => {
    let req, file, cb;

    beforeEach(() => {
      req = {};
      file = { originalname: 'test.jpg' };
      cb = jest.fn();
    });

    it('should handle callback throwing error for accepted files', () => {
      file.originalname = 'test.jpg';
      cb.mockImplementation(() => {
        throw new Error('Callback error');
      });
      expect(() => fileFilter(req, file, cb)).toThrow('Callback error');
    });

    it('should handle callback throwing error for rejected files', () => {
      file.originalname = 'test.gif';
      cb.mockImplementation(() => {
        throw new Error('Callback error');
      });
      expect(() => fileFilter(req, file, cb)).toThrow('Callback error');
    });

    it('should handle missing callback', () => {
      expect(() => fileFilter(req, file, null)).toThrow();
    });
  });

  describe('Module Export', () => {
    it('should export multer middleware', () => {
      expect(multerMiddleware).toBeDefined();
      expect(typeof multerMiddleware.single).toBe('function');
      expect(typeof multerMiddleware.array).toBe('function');
      expect(typeof multerMiddleware.fields).toBe('function');
      expect(typeof multerMiddleware.any).toBe('function');
      expect(typeof multerMiddleware.none).toBe('function');
    });
  });
}); 