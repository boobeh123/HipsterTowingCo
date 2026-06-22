const authController = require('../../../controllers/auth');
const User = require('../../../models/User');

// Replace the User model entirely — no real database involved.
// jest.mock auto-replaces all methods with jest.fn() stubs.
jest.mock('../../../models/User');

// Mock passport so postLogin doesn't try to initialise a real strategy
jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    // Default: simulate successful authentication
    req.__passportUser = req.__mockUser || null;
    req.__passportInfo = req.__mockInfo || {};
    req.__passportErr  = req.__mockErr  || null;
    const cb = req.__passportCb;
    if (cb) cb(req.__passportErr, req.__passportUser, req.__passportInfo);
  }),
}));

const passport = require('passport');

// ─────────────────────────────────────────────
// postLogin
// ─────────────────────────────────────────────
describe('authController.postLogin', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: { email: 'test@example.com', password: 'password123' },
      flash: jest.fn(),
      session: { save: jest.fn(cb => cb(null)) },
    };
    res = { redirect: jest.fn() };
    next = jest.fn();

    // Wire passport.authenticate mock to call our test callback
    passport.authenticate.mockImplementation((strategy, cb) => (req, res, next) => {
      req.__passportCb = cb;
      cb(req.__passportErr || null, req.__passportUser || null, req.__passportInfo || {});
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should flash errors and redirect to /login when email is invalid', () => {
    req.body.email = 'not-an-email';

    authController.postLogin(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('should flash errors and redirect to /login when password is too short', () => {
    req.body.password = 'ab';

    authController.postLogin(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('should flash errors and redirect to /login when credentials are incorrect', () => {
    req.__passportUser = null;
    req.__passportInfo = { message: 'Incorrect email or password.' };

    authController.postLogin(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('should flash success and redirect to / on valid credentials', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    req.__passportUser = mockUser;
    req.logIn = jest.fn((user, cb) => cb(null));

    authController.postLogin(req, res, next);

    expect(req.logIn).toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should call next with error if passport throws', () => {
    req.__passportErr = new Error('passport error');

    authController.postLogin(req, res, next);

    expect(next).toHaveBeenCalledWith(req.__passportErr);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// postSignup
// ─────────────────────────────────────────────
describe('authController.postSignup', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password12345',
        confirmPassword: 'password12345',
      },
      flash: jest.fn(),
      login: jest.fn((user, cb) => cb(null)),
      session: { save: jest.fn(cb => cb(null)) },
    };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should flash errors and redirect to /signup when email is invalid', async () => {
    req.body.email = 'not-an-email';

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when password is too short', async () => {
    req.body.password = 'abc';
    req.body.confirmPassword = 'abc';

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when passwords do not match', async () => {
    req.body.confirmPassword = 'different';

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when email already exists', async () => {
    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should create user, log in, and redirect to /onboard on valid input', async () => {
    User.findOne.mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue();

    await authController.postSignup(req, res, next);

    expect(req.login).toHaveBeenCalled();
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/onboard');
  });
});

// ─────────────────────────────────────────────
// getSignup
// ─────────────────────────────────────────────
describe('authController.getSignup', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to / if user is already logged in', async () => {
    req.user = { id: 'user123' };

    await authController.getSignup(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render signup.ejs if user is not logged in', async () => {
    await authController.getSignup(req, res, next);

    expect(res.render).toHaveBeenCalledWith('signup.ejs');
  });

  it('should call next with error if render throws', async () => {
    res.render.mockImplementation(() => { throw new Error('render failed') });

    await authController.getSignup(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────
// getLogin
// ─────────────────────────────────────────────
describe('authController.getLogin', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to / if user is already logged in', async () => {
    req.user = { id: 'user123' };

    await authController.getLogin(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render login.ejs if user is not logged in', async () => {
    await authController.getLogin(req, res, next);

    expect(res.render).toHaveBeenCalledWith('login.ejs');
  });

  it('should call next with error if render throws', async () => {
    res.render.mockImplementation(() => { throw new Error('render failed') });

    await authController.getLogin(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────
// getLogout
// ─────────────────────────────────────────────
describe('authController.getLogout', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      logout: jest.fn(cb => cb(null)),
      session: { destroy: jest.fn(cb => cb(null)) },
    };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call req.logout, destroy the session, and redirect to /', () => {
    authController.getLogout(req, res, next);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should call next with error if req.logout fails', () => {
    const error = new Error('logout failed');
    req.logout = jest.fn(cb => cb(error));

    authController.getLogout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should call next with error if session.destroy fails', () => {
    const error = new Error('destroy failed');
    req.session.destroy = jest.fn(cb => cb(error));

    authController.getLogout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
