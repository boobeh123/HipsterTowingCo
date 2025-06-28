const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authController = require('../controllers/auth');
const homeController = require('../controllers/home');
const passwordResetController = require('../controllers/reset');
const privacyController = require('../controllers/privacy');
const termController = require('../controllers/terms');

jest.mock('../controllers/auth', () => ({
  getLogin: jest.fn((req, res) => res.status(200).json({ message: 'Login page' })),
  postLogin: jest.fn((req, res) => res.status(200).json({ message: 'Login successful' })),
  logout: jest.fn((req, res) => res.status(200).json({ message: 'Logout successful' })),
  getSignup: jest.fn((req, res) => res.status(200).json({ message: 'Signup page' })),
  postSignup: jest.fn((req, res) => res.status(200).json({ message: 'Signup successful' }))
}));

jest.mock('../controllers/home', () => ({
  getIndex: jest.fn((req, res) => res.status(200).json({ message: 'Home page' }))
}));

jest.mock('../controllers/reset', () => ({
  getPasswordReset: jest.fn((req, res) => res.status(200).json({ message: 'Forgot password page' })),
  postPasswordReset: jest.fn((req, res) => res.status(200).json({ message: 'Password reset email sent' })),
  getRecoverPassword: jest.fn((req, res) => res.status(200).json({ message: 'Recover password page' })),
  postRecoverPassword: jest.fn((req, res) => res.status(200).json({ message: 'Password recovered' }))
}));

jest.mock('../controllers/privacy', () => ({
  getPrivacy: jest.fn((req, res) => res.status(200).json({ message: 'Privacy page' }))
}));

jest.mock('../controllers/terms', () => ({
  getTerms: jest.fn((req, res) => res.status(200).json({ message: 'Terms page' }))
}));

describe('Main Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    const mainRoutes = require('../routes/main');
    app.use('/', mainRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should call homeController.getIndex', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(homeController.getIndex).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Home page' });
    });
  });

  describe('GET /login', () => {
    it('should call authController.getLogin', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(authController.getLogin).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Login page' });
    });
  });

  describe('POST /login', () => {
    it('should call authController.postLogin', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(authController.postLogin).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Login successful' });
    });
  });

  describe('GET /logout', () => {
    it('should call authController.logout', async () => {
      const response = await request(app)
        .get('/logout')
        .expect(200);

      expect(authController.logout).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Logout successful' });
    });
  });

  describe('GET /signup', () => {
    it('should call authController.getSignup', async () => {
      const response = await request(app)
        .get('/signup')
        .expect(200);

      expect(authController.getSignup).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Signup page' });
    });
  });

  describe('POST /signup', () => {
    it('should call authController.postSignup', async () => {
      const signupData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        password2: 'password123'
      };

      const response = await request(app)
        .post('/signup')
        .send(signupData)
        .expect(200);

      expect(authController.postSignup).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Signup successful' });
    });
  });

  describe('GET /forgot', () => {
    it('should call passwordResetController.getPasswordReset', async () => {
      const response = await request(app)
        .get('/forgot')
        .expect(200);

      expect(passwordResetController.getPasswordReset).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Forgot password page' });
    });
  });

  describe('POST /forgot', () => {
    it('should call passwordResetController.postPasswordReset', async () => {
      const forgotData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/forgot')
        .send(forgotData)
        .expect(200);

      expect(passwordResetController.postPasswordReset).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Password reset email sent' });
    });
  });

  describe('GET /reset/:token', () => {
    it('should call passwordResetController.getRecoverPassword with token parameter', async () => {
      const token = 'test-token-123';

      const response = await request(app)
        .get(`/reset/${token}`)
        .expect(200);

      expect(passwordResetController.getRecoverPassword).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Recover password page' });
    });
  });

  describe('POST /reset/:token', () => {
    it('should call passwordResetController.postRecoverPassword with token parameter', async () => {
      const token = 'test-token-123';
      const resetData = {
        password: 'newpassword123',
        password2: 'newpassword123'
      };

      const response = await request(app)
        .post(`/reset/${token}`)
        .send(resetData)
        .expect(200);

      expect(passwordResetController.postRecoverPassword).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Password recovered' });
    });
  });

  describe('GET /privacy', () => {
    it('should call privacyController.getPrivacy', async () => {
      const response = await request(app)
        .get('/privacy')
        .expect(200);

      expect(privacyController.getPrivacy).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Privacy page' });
    });
  });

  describe('GET /terms', () => {
    it('should call termController.getTerms', async () => {
      const response = await request(app)
        .get('/terms')
        .expect(200);

      expect(termController.getTerms).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Terms page' });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });
  });
}); 