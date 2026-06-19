const { ensureAuth, ensureAuthApi } = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // ensureAuth — page route guard
  // ─────────────────────────────────────────────
  describe('ensureAuth', () => {
    it('should call next() when req.user is set', () => {
      req.user = { id: 'user123' };

      ensureAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to / when req.user is null', () => {
      req.user = null;

      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to / when req.user is undefined', () => {
      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // ensureAuthApi — API route guard
  // ─────────────────────────────────────────────
  describe('ensureAuthApi', () => {
    it('should call next() when req.user is set', () => {
      req.user = { id: 'user123' };

      ensureAuthApi(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 JSON when req.user is null', () => {
      req.user = null;

      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorised' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 JSON when req.user is undefined', () => {
      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorised' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
