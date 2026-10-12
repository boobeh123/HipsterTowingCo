const { ensureAuth, ensureAuthApi, ensureOnboarding, markLoginTime, endStaleSessions } = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      user: null,
    };
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
    it('should call next() when authenticated and name is set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: 'Jordan Rivera' };

      ensureAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to /login when not authenticated (user is null)', () => {
      req.user = null;

      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to /login when not authenticated (user is undefined)', () => {
      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to /onboard when authenticated but name is empty string', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: '' };

      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/onboard');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to /onboard when authenticated but name is not set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123' };

      ensureAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/onboard');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // ensureAuthApi — API route guard
  // ─────────────────────────────────────────────
  describe('ensureAuthApi', () => {
    it('should call next() when authenticated and name is set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: 'Jordan Rivera' };

      ensureAuthApi(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 JSON when not authenticated (user is null)', () => {
      req.user = null;

      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 JSON when not authenticated (user is undefined)', () => {
      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 JSON when authenticated but name is empty string', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: '' };

      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Onboarding required.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 JSON when authenticated but name is not set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123' };

      ensureAuthApi(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Onboarding required.' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // ensureOnboarding — /onboard route guard
  // ─────────────────────────────────────────────
  describe('ensureOnboarding', () => {
    it('should call next() when authenticated and name is not set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: '' };

      ensureOnboarding(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to /login when not authenticated', () => {
      req.user = null;

      ensureOnboarding(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect to /dashboard when authenticated and name is already set', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 'user123', name: 'Jordan Rivera' };

      ensureOnboarding(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // markLoginTime / endStaleSessions — sign out other devices after a reset
  // ─────────────────────────────────────────────
  describe('markLoginTime', () => {
    it('should record the login time on the session', () => {
      req.session = {};
      const before = Date.now();

      markLoginTime(req);

      expect(req.session.loginAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('endStaleSessions', () => {
    const CHANGED_AT = new Date('2026-10-01T12:00:00Z');

    beforeEach(() => {
      req.session = {};
      req.logout = jest.fn((cb) => cb());
    });

    it('should let a visitor through untouched', () => {
      req.user = undefined;

      endStaleSessions(req, res, next);

      expect(req.logout).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should let a user through when the password was never reset', () => {
      req.user = { id: 'user123' };

      endStaleSessions(req, res, next);

      expect(req.logout).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should keep a session that logged in after the last reset', () => {
      req.user = { id: 'user123', passwordChangedAt: CHANGED_AT };
      req.session.loginAt = CHANGED_AT.getTime() + 1000;

      endStaleSessions(req, res, next);

      expect(req.logout).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should sign out a session that logged in before the last reset', () => {
      req.user = { id: 'user123', passwordChangedAt: CHANGED_AT };
      req.session.loginAt = CHANGED_AT.getTime() - 1000;

      endStaleSessions(req, res, next);

      expect(req.logout).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
    });

    // Sessions from before this feature have no loginAt at all
    it('should sign out a session with no recorded login time once a reset happens', () => {
      req.user = { id: 'user123', passwordChangedAt: CHANGED_AT };

      endStaleSessions(req, res, next);

      expect(req.logout).toHaveBeenCalledTimes(1);
    });

    it('should pass a logout error on to the error handler', () => {
      const error = new Error('session store down');
      req.user = { id: 'user123', passwordChangedAt: CHANGED_AT };
      req.logout = jest.fn((cb) => cb(error));

      endStaleSessions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
