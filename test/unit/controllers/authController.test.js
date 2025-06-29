const authController = require('../../../controllers/auth');
const User = require('../../../models/User');

jest.mock('../../../models/User');

describe('authController.postSignup', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        terms: 'on',
      },
      flash: jest.fn(),
    };
    res = {
      redirect: jest.fn(),
      flash: jest.fn(),
    };
    next = jest.fn();
    User.findOne.mockReset();
    User.prototype.save = jest.fn(function(cb) { cb && cb(null); });
  });

  it('should reject invalid email', () => {
    req.body.email = 'bad';
    authController.postSignup(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('../signup');
    expect(req.flash).toHaveBeenCalled();
  });

  it('should reject short password', () => {
    req.body.password = 'short';
    req.body.confirmPassword = 'short';
    authController.postSignup(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('../signup');
    expect(req.flash).toHaveBeenCalled();
  });

  it('should reject mismatched passwords', () => {
    req.body.confirmPassword = 'different';
    authController.postSignup(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('../signup');
    expect(req.flash).toHaveBeenCalled();
  });

  it('should reject if terms not agreed', () => {
    req.body.terms = undefined;
    authController.postSignup(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('../signup');
    expect(req.flash).toHaveBeenCalled();
  });

  it('should reject if user already exists', done => {
    User.findOne.mockImplementation((query, cb) => cb(null, { email: 'test@example.com' }));
    authController.postSignup(req, res, next);
    setImmediate(() => {
      expect(res.redirect).toHaveBeenCalledWith('../signup');
      expect(req.flash).toHaveBeenCalled();
      done();
    });
  });

  it('should create user and redirect on valid input', done => {
    User.findOne.mockImplementation((query, cb) => cb(null, null));
    User.prototype.save = jest.fn(function(cb) { cb && cb(null); });
    req.logIn = jest.fn((user, cb) => cb(null));
    authController.postSignup(req, res, next);
    setImmediate(() => {
      expect(res.redirect).toHaveBeenCalledWith('/todos');
      done();
    });
  });
});

describe('authController.getSignup', () => {
  let req, res;
  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
  });

  it('should redirect to /todos if user is logged in', () => {
    req.user = { id: 'user123' };
    authController.getSignup(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });

  it('should render signup page if not logged in', () => {
    authController.getSignup(req, res);
    expect(res.render).toHaveBeenCalledWith('signup', { title: 'Create Account' });
  });
});

describe('authController.logout', () => {
  let req, res;
  beforeEach(() => {
    req = {
      logout: jest.fn(cb => cb && cb()),
      session: { destroy: jest.fn(cb => cb && cb()) },
    };
    res = { redirect: jest.fn() };
  });

  it('should call req.logout, destroy session, and redirect to /', () => {
    authController.logout(req, res);
    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

describe('authController.getLogin', () => {
  let req, res;
  beforeEach(() => {
    req = { user: null };
    res = { render: jest.fn(), redirect: jest.fn() };
  });

  it('should redirect to /todos if user is logged in', () => {
    req.user = { id: 'user123' };
    authController.getLogin(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });

  it('should render login page if not logged in', () => {
    authController.getLogin(req, res);
    expect(res.render).toHaveBeenCalledWith('login', { title: 'Login' });
  });
}); 