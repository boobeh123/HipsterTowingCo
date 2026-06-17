const authController = require('../../../controllers/auth');
const User = require('../../../models/User');

// Replace the User model entirely — no real database involved.
// jest.mock auto-replaces all methods with jest.fn() stubs.
jest.mock('../../../models/User');

// ─────────────────────────────────────────────
// postSignup
// ─────────────────────────────────────────────
describe('authController.postSignup', () => {
  let req, res, next;

  beforeEach(() => {
    // Minimal req object with what postSignup actually reads
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
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when password is too short', async () => {
    req.body.password = 'abc';
    req.body.confirmPassword = 'abc';

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when passwords do not match', async () => {
    req.body.confirmPassword = 'different';

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should flash errors and redirect to /signup when email already exists', async () => {
    // findOne returns an existing user — account already taken
    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    await authController.postSignup(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(res.redirect).toHaveBeenCalledWith('/signup');
  });

  it('should create user, flash success, and redirect to / on valid input', async () => {
    // findOne returns null — email is available
    User.findOne.mockResolvedValue(null);
    // save resolves without error
    User.prototype.save = jest.fn().mockResolvedValue();

    await authController.postSignup(req, res, next);

    expect(req.login).toHaveBeenCalled();
    expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

// ─────────────────────────────────────────────
// getSignup
// ─────────────────────────────────────────────
describe('authController.getSignup', () => {
  let req, res;

  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to / if user is already logged in', async () => {
    req.user = { id: 'user123' };

    await authController.getSignup(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render signup.ejs if user is not logged in', async () => {
    await authController.getSignup(req, res);

    expect(res.render).toHaveBeenCalledWith('signup.ejs');
  });
});

// ─────────────────────────────────────────────
// getLogin
// ─────────────────────────────────────────────
describe('authController.getLogin', () => {
  let req, res;

  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to / if user is already logged in', async () => {
    req.user = { id: 'user123' };

    await authController.getLogin(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render login.ejs if user is not logged in', async () => {
    await authController.getLogin(req, res);

    expect(res.render).toHaveBeenCalledWith('login.ejs');
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
});
