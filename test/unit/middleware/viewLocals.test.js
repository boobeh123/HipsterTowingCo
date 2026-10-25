const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('../../../middleware/flash');
const viewLocals = require('../../../middleware/viewLocals');
const privacyPolicy = require('../../../utils/privacyPolicy');

describe('viewLocals', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      session: {},
      flash: jest.fn(() => []),
      path: '/dashboard',
      user: undefined,
    };
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Reading never writes to the session (middleware/flash.js), so every type
  // is read on every request; the real-session tests below check the cookie
  it('should read every flash type into its own local', () => {
    req.flash = jest.fn((type) => (type === 'success' ? ['Inspection deleted.'] : []));

    viewLocals(req, res, next);

    expect(req.flash.mock.calls.map(([type]) => type)).toEqual(['success', 'errors', 'error', 'info']);
    expect(res.locals).toMatchObject({ success: ['Inspection deleted.'], errors: [], error: [], info: [] });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should set currentPath from req.path and user to null when logged out', () => {
    viewLocals(req, res, next);

    expect(res.locals.currentPath).toBe('/dashboard');
    expect(res.locals.user).toBeNull();
  });

  it('should expose the logged-in user', () => {
    req.user = { name: 'Jordan Rivera' };

    viewLocals(req, res, next);

    expect(res.locals.user).toEqual({ name: 'Jordan Rivera' });
  });

  // utils/privacyPolicy.js decides; privacyPolicy.test.js covers who it tells
  it("should show the privacy notice when the policy says this user needs it", () => {
    const needsPrivacyNotice = jest.spyOn(privacyPolicy, 'needsPrivacyNotice').mockReturnValueOnce(true);
    req.user = { name: 'Jordan Rivera' };

    viewLocals(req, res, next);

    expect(needsPrivacyNotice).toHaveBeenCalledWith(req.user);
    expect(res.locals.showPrivacyNotice).toBe(true);
    needsPrivacyNotice.mockRestore();
  });

  it('should not show the privacy notice to a guest', () => {
    viewLocals(req, res, next);

    expect(res.locals.showPrivacyNotice).toBe(false);
  });

  // ─────────────────────────────────────────────
  // With the real session and flash middleware, the way server.js wires them
  // ─────────────────────────────────────────────
  describe('with express-session and the flash middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
      app.use(flash);
      app.use(viewLocals);
      app.get('/', (req, res) => res.json({ success: res.locals.success }));
      app.get('/set-flash', (req, res) => {
        req.flash('success', 'Welcome back.');
        res.json({ ok: true });
      });
    });

    it('should not set a session cookie for an anonymous visitor', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should still deliver a flash on the next request', async () => {
      const agent = request.agent(app);
      await agent.get('/set-flash').expect(200);

      const response = await agent.get('/').expect(200);

      expect(response.body.success).toEqual(['Welcome back.']);
    });

    it('should show a flash only once', async () => {
      const agent = request.agent(app);
      await agent.get('/set-flash').expect(200);
      await agent.get('/').expect(200);

      const response = await agent.get('/').expect(200);

      expect(response.body.success).toEqual([]);
    });
  });
});
