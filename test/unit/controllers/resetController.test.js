const resetController = require('../../../controllers/reset');
const User = require('../../../models/User');
const validator = require('validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const asyncLib = require('async');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

jest.mock('../../../models/User');
jest.mock('validator');
jest.mock('crypto');
jest.mock('async');

describe('resetController.getPasswordReset', () => {
  let req, res;
  beforeEach(() => {
    req = { isAuthenticated: jest.fn() };
    res = { render: jest.fn(), redirect: jest.fn() };
  });
  it('should redirect to /todos if authenticated', () => {
    req.isAuthenticated.mockReturnValue(true);
    resetController.getPasswordReset(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });
  it('should render forgot.ejs if not authenticated', () => {
    req.isAuthenticated.mockReturnValue(false);
    resetController.getPasswordReset(req, res);
    expect(res.render).toHaveBeenCalledWith('forgot.ejs');
  });
});

describe('resetController.postPasswordReset', () => {
  let req, res;
  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn(),
      body: { email: 'test@example.com' },
      flash: jest.fn(),
      headers: { host: 'localhost:3000' }
    };
    res = { redirect: jest.fn() };
    validator.isEmail.mockReset();
    asyncLib.waterfall.mockReset();
  });
  it('should redirect to /todos if authenticated', async () => {
    req.isAuthenticated.mockReturnValue(true);
    await resetController.postPasswordReset(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });
  it('should flash error and redirect if email invalid', async () => {
    req.isAuthenticated.mockReturnValue(false);
    validator.isEmail.mockReturnValue(false);
    await resetController.postPasswordReset(req, res);
    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
    expect(res.redirect).toHaveBeenCalledWith('/forgot');
  });
  it('should call async.waterfall if email valid', async () => {
    req.isAuthenticated.mockReturnValue(false);
    validator.isEmail.mockReturnValue(true);
    asyncLib.waterfall.mockImplementation((tasks, cb) => cb());
    await resetController.postPasswordReset(req, res);
    expect(asyncLib.waterfall).toHaveBeenCalled();
  });
});

describe('resetController.getRecoverPassword', () => {
  let req, res;
  beforeEach(() => {
    req = { isAuthenticated: jest.fn(), params: { token: 'abc' } };
    res = { render: jest.fn(), redirect: jest.fn() };
  });
  it('should redirect to /todos if authenticated', async () => {
    req.isAuthenticated.mockReturnValue(true);
    await resetController.getRecoverPassword(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });
  it('should render recover.ejs with token if not authenticated', async () => {
    req.isAuthenticated.mockReturnValue(false);
    await resetController.getRecoverPassword(req, res);
    expect(res.render).toHaveBeenCalledWith('recover.ejs', { token: 'abc' });
  });
});

describe('resetController.postRecoverPassword', () => {
  let req, res;
  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn(),
      body: { password: 'password123', confirmPassword: 'password123' },
      params: { token: 'abc' },
      flash: jest.fn(),
      logIn: jest.fn((user, cb) => cb(null)),
    };
    res = { redirect: jest.fn() };
    validator.isLength.mockReset();
    asyncLib.waterfall.mockReset();
  });
  it('should redirect to /todos if authenticated', async () => {
    req.isAuthenticated.mockReturnValue(true);
    await resetController.postRecoverPassword(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });
  it('should flash error if password too short', async () => {
    req.isAuthenticated.mockReturnValue(false);
    validator.isLength.mockReturnValue(false);
    await resetController.postRecoverPassword(req, res);
    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
  });
  it('should flash error if passwords do not match', async () => {
    req.isAuthenticated.mockReturnValue(false);
    validator.isLength.mockReturnValue(true);
    req.body.confirmPassword = 'different';
    await resetController.postRecoverPassword(req, res);
    expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
  });
  it('should call async.waterfall if validation passes', async () => {
    req.isAuthenticated.mockReturnValue(false);
    validator.isLength.mockReturnValue(true);
    req.body.confirmPassword = 'password123';
    asyncLib.waterfall.mockImplementation((tasks, cb) => cb());
    await resetController.postRecoverPassword(req, res);
    expect(asyncLib.waterfall).toHaveBeenCalled();
  });
}); 