const { ensureAuth } = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn()
    };
    res = {
      redirect: jest.fn()
    };
    next = jest.fn();
  });

  describe('ensureAuth', () => {
    it('should call next() when user is authenticated', () => {
      req.isAuthenticated.mockReturnValue(true);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to home page when user is not authenticated', () => {
      req.isAuthenticated.mockReturnValue(false);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle undefined authentication status', () => {
      req.isAuthenticated.mockReturnValue(undefined);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle null authentication status', () => {
      req.isAuthenticated.mockReturnValue(null);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty string authentication status', () => {
      req.isAuthenticated.mockReturnValue('');

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle zero authentication status', () => {
      req.isAuthenticated.mockReturnValue(0);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle false authentication status', () => {
      req.isAuthenticated.mockReturnValue(false);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle truthy authentication status', () => {
      req.isAuthenticated.mockReturnValue('user123');

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should handle object authentication status', () => {
      req.isAuthenticated.mockReturnValue({ id: 1, name: 'test' });

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should handle array authentication status', () => {
      req.isAuthenticated.mockReturnValue([1, 2, 3]);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should handle number authentication status', () => {
      req.isAuthenticated.mockReturnValue(42);

      ensureAuth(req, res, next);

      expect(req.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing isAuthenticated method', () => {
      delete req.isAuthenticated;

      expect(() => {
        ensureAuth(req, res, next);
      }).toThrow();
    });

    it('should handle isAuthenticated throwing an error', () => {
      req.isAuthenticated.mockImplementation(() => {
        throw new Error('Authentication error');
      });

      expect(() => {
        ensureAuth(req, res, next);
      }).toThrow('Authentication error');
    });

    it('should handle redirect throwing an error', () => {
      req.isAuthenticated.mockReturnValue(false);
      res.redirect.mockImplementation(() => {
        throw new Error('Redirect error');
      });

      expect(() => {
        ensureAuth(req, res, next);
      }).toThrow('Redirect error');
    });

    it('should handle next throwing an error', () => {
      req.isAuthenticated.mockReturnValue(true);
      next.mockImplementation(() => {
        throw new Error('Next error');
      });

      expect(() => {
        ensureAuth(req, res, next);
      }).toThrow('Next error');
    });
  });
}); 