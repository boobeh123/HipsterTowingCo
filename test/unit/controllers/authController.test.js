const authController = require('../../../controllers/auth');
const User = require('../../../models/User');
const { validateLogin, validateSignup } = require('../../../middleware/validators');
const runValidators = require('../helpers/runValidators');

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
// postLogin (after validateLogin, as on the route)
// ─────────────────────────────────────────────
describe('authController.postLogin', () => {
  let req, res, next;

  // Runs the route's validators, then the controller
  const postLogin = async () => {
    await runValidators(validateLogin, req);
    authController.postLogin(req, res, next);
  };

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

  it('should flash errors and redirect to /login when email is invalid', async () => {
    req.body.email = 'not-an-email';

    await postLogin();

    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter a valid email address.' }]);
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  // These used to throw inside validator.js and show the 500 page
  it('should flash errors instead of failing when fields are missing or not text', async () => {
    req.body = { email: { $ne: null }, password: ['a', 'b'] };

    await postLogin();

    expect(passport.authenticate).not.toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('errors', [
      { msg: 'Please enter a valid email address.' },
      { msg: 'Please enter your password.' },
    ]);
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
  });

  it('should hand passport the normalised email', async () => {
    req.body.email = '  Test@Example.COM ';
    req.__passportUser = null;

    await postLogin();

    expect(passport.authenticate).toHaveBeenCalled();
    expect(req.body.email).toBe('test@example.com');
  });

  // Login deliberately has no password-length check. Accounts created before the
  // minimum was raised to 8 still have shorter passwords, and rejecting them here
  // would lock those users out. Passport decides whether the credentials are valid.
  it('should NOT reject a short password at login — it goes to passport', async () => {
    req.body.password = 'ab';
    req.__passportUser = { id: 'user123' };
    req.logIn = jest.fn((user, cb) => cb(null));

    await postLogin();

    expect(passport.authenticate).toHaveBeenCalled();
    expect(req.logIn).toHaveBeenCalled();
    expect(req.flash).not.toHaveBeenCalledWith('errors', expect.any(Array));
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should still reject an invalid email regardless of password length', async () => {
    req.body.email = 'not-an-email';
    req.body.password = 'ab';

    await postLogin();

    expect(passport.authenticate).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('should flash errors and redirect to /login when credentials are incorrect', async () => {
    req.__passportUser = null;
    req.__passportInfo = { message: 'Incorrect email or password.' };

    await postLogin();

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('should flash success and redirect to / on valid credentials', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    req.__passportUser = mockUser;
    req.logIn = jest.fn((user, cb) => cb(null));

    await postLogin();

    expect(req.logIn).toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  // endStaleSessions compares this with the account's passwordChangedAt
  it('should record when the session logged in', async () => {
    req.__passportUser = { id: 'user123' };
    req.logIn = jest.fn((user, cb) => cb(null));
    const before = Date.now();

    await postLogin();

    expect(req.session.loginAt).toBeGreaterThanOrEqual(before);
  });

  it('should call next with error if passport throws', async () => {
    req.__passportErr = new Error('passport error');

    await postLogin();

    expect(next).toHaveBeenCalledWith(req.__passportErr);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// postSignup (after validateSignup, as on the route)
// ─────────────────────────────────────────────
describe('authController.postSignup', () => {
  let req, res, next;

  // Runs the route's validators, then the controller
  const postSignup = async () => {
    await runValidators(validateSignup, req);
    await authController.postSignup(req, res, next);
  };

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password12345',
        confirmPassword: 'password12345',
        terms: 'on',
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

    await postSignup();

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when password is too short', async () => {
    req.body.password = 'abc';
    req.body.confirmPassword = 'abc';

    await postSignup();

    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Password must be at least 8 characters long.' }]);
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when passwords do not match', async () => {
    req.body.confirmPassword = 'different';

    await postSignup();

    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Passwords do not match.' }]);
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should refuse the signup when the Terms of Use box is not ticked', async () => {
    delete req.body.terms;

    await postSignup();

    expect(User.prototype.save).not.toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please agree to the Terms of Use to create an account.' }]);
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  // The flash goes into the session database, so it must never carry the
  // password that was typed
  it('should flash only messages, never the submitted values', async () => {
    req.body.email = 'not-an-email';
    req.body.password = 'short';
    req.body.confirmPassword = 'shorter';

    await postSignup();

    const flashed = req.flash.mock.calls.find(([type]) => type === 'errors')[1];
    expect(flashed.every((error) => Object.keys(error).join() === 'msg')).toBe(true);
    expect(JSON.stringify(flashed)).not.toContain('short');
  });

  it('should flash errors and redirect to /signup when email already exists', async () => {
    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    await postSignup();

    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'An account with that email address already exists.' }]);
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  // Two signups for one address at once both pass the findOne check, and
  // the unique index rejects the second save
  it('should flash the same message when the save hits the unique email index', async () => {
    User.findOne.mockResolvedValue(null);
    const duplicate = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    User.prototype.save = jest.fn().mockRejectedValue(duplicate);

    await postSignup();

    expect(next).not.toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'An account with that email address already exists.' }]);
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should create user, log in, and redirect to /onboard on valid input', async () => {
    User.findOne.mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue();

    await postSignup();

    expect(req.login).toHaveBeenCalled();
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/onboard');
  });

  it('should save the normalised email, record the Terms acceptance and the login time', async () => {
    req.body.email = 'Test@Example.COM';
    User.findOne.mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue();
    const before = Date.now();

    await postSignup();

    expect(User).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      termsAcceptedAt: expect.any(Date),
    }));
    expect(req.session.loginAt).toBeGreaterThanOrEqual(before);
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
// postLogout
// ─────────────────────────────────────────────
describe('authController.postLogout', () => {
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
    authController.postLogout(req, res, next);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should call next with error if req.logout fails', () => {
    const error = new Error('logout failed');
    req.logout = jest.fn(cb => cb(error));

    authController.postLogout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should call next with error if session.destroy fails', () => {
    const error = new Error('destroy failed');
    req.session.destroy = jest.fn(cb => cb(error));

    authController.postLogout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
