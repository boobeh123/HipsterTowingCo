const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const viewLocals = require('../../../middleware/viewLocals');

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

  it('should not read or create flash storage when no flash is waiting', () => {
    viewLocals(req, res, next);

    expect(req.flash).not.toHaveBeenCalled();
    expect(req.session).toEqual({});
    expect(res.locals).toMatchObject({ success: [], errors: [], error: [], info: [] });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should read every flash type when a flash is waiting', () => {
    req.session.flash = { success: ['Inspection deleted.'] };
    req.flash = jest.fn((type) => (type === 'success' ? ['Inspection deleted.'] : []));

    viewLocals(req, res, next);

    expect(req.flash).toHaveBeenCalledTimes(4);
    expect(res.locals.success).toEqual(['Inspection deleted.']);
    expect(res.locals.errors).toEqual([]);
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

  // ─────────────────────────────────────────────
  // With the real session and connect-flash, the way server.js wires them
  // ─────────────────────────────────────────────
  describe('with express-session and connect-flash', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
      app.use(flash());
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
  });
});
