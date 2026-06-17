const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authController = require('../../../controllers/auth');
const homeController = require('../../../controllers/home');
const passwordResetController = require('../../../controllers/reset');
const privacyController = require('../../../controllers/privacy');
const termController = require('../../../controllers/terms');
const mainRoutes = require('../../../routes/main');

// Replace every controller with a lightweight fake.
// This isolates the route layer — we're testing that the right
// controller method is called for each URL, not what that method does.
jest.mock('../../../controllers/auth', () => ({
  getLogin:   jest.fn((req, res) => res.json({ message: 'Login page' })),
  postLogin:  jest.fn((req, res) => res.json({ message: 'Login successful' })),
  getLogout:  jest.fn((req, res) => res.json({ message: 'Logout successful' })),
  getSignup:  jest.fn((req, res) => res.json({ message: 'Signup page' })),
  postSignup: jest.fn((req, res) => res.json({ message: 'Signup successful' })),
}));

jest.mock('../../../controllers/home', () => ({
  getIndex: jest.fn((req, res) => res.json({ message: 'Home page' })),
}));

// revisit when POST /forgot, GET/POST /reset/:token are implemented
jest.mock('../../../controllers/reset', () => ({
  getPasswordReset: jest.fn((req, res) => res.json({ message: 'Forgot password page' })),
}));

jest.mock('../../../controllers/privacy', () => ({
  getPrivacy: jest.fn((req, res) => res.json({ message: 'Privacy page' })),
}));

jest.mock('../../../controllers/terms', () => ({
  getTerms: jest.fn((req, res) => res.json({ message: 'Terms page' })),
}));

describe('Main Routes', () => {
  let app;

  beforeEach(() => {
    // Build a minimal Express app for each test.
    // No real database, no MongoStore — just enough to mount the routes.
    app = express();
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', mainRoutes);
  });

  // Clear call counts after each test so they don't bleed into the next one.
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should call homeController.getIndex and return 200', async () => {
      const response = await request(app).get('/').expect(200);

      expect(homeController.getIndex).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Home page' });
    });
  });

  describe('GET /login', () => {
    it('should call authController.getLogin and return 200', async () => {
      const response = await request(app).get('/login').expect(200);

      expect(authController.getLogin).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Login page' });
    });
  });

  describe('POST /login', () => {
    it('should call authController.postLogin and return 200', async () => {
      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(authController.postLogin).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Login successful' });
    });
  });

  describe('GET /logout', () => {
    it('should call authController.getLogout and return 200', async () => {
      const response = await request(app).get('/logout').expect(200);

      // Note: the method is getLogout, not logout
      expect(authController.getLogout).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Logout successful' });
    });
  });

  describe('GET /signup', () => {
    it('should call authController.getSignup and return 200', async () => {
      const response = await request(app).get('/signup').expect(200);

      expect(authController.getSignup).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Signup page' });
    });
  });

  describe('POST /signup', () => {
    it('should call authController.postSignup and return 200', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(200);

      expect(authController.postSignup).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Signup successful' });
    });
  });

  describe('GET /forgot', () => {
    it('should call passwordResetController.getPasswordReset and return 200', async () => {
      const response = await request(app).get('/forgot').expect(200);

      expect(passwordResetController.getPasswordReset).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Forgot password page' });
    });
  });

  describe('GET /privacy', () => {
    it('should call privacyController.getPrivacy and return 200', async () => {
      const response = await request(app).get('/privacy').expect(200);

      expect(privacyController.getPrivacy).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Privacy page' });
    });
  });

  describe('GET /terms', () => {
    it('should call termController.getTerms and return 200', async () => {
      const response = await request(app).get('/terms').expect(200);

      expect(termController.getTerms).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Terms page' });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for a route that does not exist', async () => {
      await request(app).get('/nonexistent').expect(404);
    });
  });
});
