const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authController = require('../../../controllers/auth');
const homeController = require('../../../controllers/home');
const passwordResetController = require('../../../controllers/reset');
const privacyController = require('../../../controllers/privacy');
const termController = require('../../../controllers/terms');
const inspectionController = require('../../../controllers/inspection');
const dashboardController = require('../../../controllers/dashboard');
const profileController = require('../../../controllers/profile');
const mainRoutes = require('../../../routes/main');

jest.mock('../../../controllers/auth', () => ({
  getLogin:   jest.fn((req, res) => res.json({ message: 'Login page' })),
  postLogin:  jest.fn((req, res) => res.json({ message: 'Login successful' })),
  getLogout:  jest.fn((req, res) => res.json({ message: 'Logout successful' })),
  getSignup:  jest.fn((req, res) => res.json({ message: 'Signup page' })),
  postSignup: jest.fn((req, res) => res.json({ message: 'Signup successful' })),
}));

jest.mock('../../../controllers/home', () => ({
  getIndex:            jest.fn((req, res) => res.json({ message: 'Home page' })),
  postInspectionCount: jest.fn((req, res) => res.json({ count: 1 })),
}));

jest.mock('../../../controllers/reset', () => ({
  getPasswordReset:    jest.fn((req, res) => res.json({ message: 'Forgot password page' })),
  postPasswordReset:   jest.fn((req, res) => res.json({ message: 'Password reset email sent' })),
  getRecoverPassword:  jest.fn((req, res) => res.json({ message: 'Recover password page' })),
  postRecoverPassword: jest.fn((req, res) => res.json({ message: 'Password recovered' })),
}));

jest.mock('../../../controllers/privacy', () => ({
  getPrivacy: jest.fn((req, res) => res.json({ message: 'Privacy page' })),
}));

jest.mock('../../../controllers/terms', () => ({
  getTerms: jest.fn((req, res) => res.json({ message: 'Terms page' })),
}));

jest.mock('../../../controllers/inspection', () => ({
  postInspection: jest.fn((req, res) => res.status(201).json({ success: true })),
}));

jest.mock('../../../controllers/dashboard', () => ({
  getDashboard:   jest.fn((req, res) => res.json({ message: 'Dashboard page' })),
  getInspection:  jest.fn((req, res) => res.json({ message: 'Inspection data' })),
}));

jest.mock('../../../controllers/profile', () => ({
  getProfile:    jest.fn((req, res) => res.json({ message: 'Profile page' })),
  updatePhoto:   jest.fn((req, res) => res.json({ message: 'Photo updated' })),
  deleteAccount: jest.fn((req, res) => res.json({ message: 'Account deleted' })),
}));

// Mock multer so file upload routes don't require real files
jest.mock('../../../middleware/multer', () => {
  const multerMock = { single: jest.fn(() => (req, res, next) => next()) };
  return multerMock;
});

// Mock ensureAuthApi so we control auth in route tests
jest.mock('../../../middleware/auth', () => ({
  ensureAuth:    jest.fn((req, res, next) => next()),
  ensureAuthApi: jest.fn((req, res, next) => {
    if (req.headers['x-test-auth'] === 'true') {
      return next()
    }
    res.status(401).json({ error: 'Unauthorised' })
  }),
}));

const { ensureAuthApi } = require('../../../middleware/auth');

describe('Main Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/', mainRoutes);
  });

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

  describe('POST /inspections/count', () => {
    it('should call homeController.postInspectionCount and return 200', async () => {
      const response = await request(app)
        .post('/inspections/count')
        .expect(200);

      expect(homeController.postInspectionCount).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ count: 1 });
    });
  });

  describe('POST /inspections', () => {
    it('should call inspectionController.postInspection and return 201 when authenticated', async () => {
      const response = await request(app)
        .post('/inspections')
        .set('x-test-auth', 'true')
        .send({ truckTractorNo: '12345' })
        .expect(201);

      expect(inspectionController.postInspection).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ success: true });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/inspections')
        .send({ truckTractorNo: '12345' })
        .expect(401);

      expect(inspectionController.postInspection).not.toHaveBeenCalled();
      expect(response.body).toEqual({ error: 'Unauthorised' });
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

  describe('POST /forgot', () => {
    it('should call passwordResetController.postPasswordReset and return 200', async () => {
      const response = await request(app)
        .post('/forgot')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(passwordResetController.postPasswordReset).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Password reset email sent' });
    });
  });

  describe('GET /reset/:token', () => {
    it('should call passwordResetController.getRecoverPassword and return 200', async () => {
      const response = await request(app)
        .get('/reset/test-token-123')
        .expect(200);

      expect(passwordResetController.getRecoverPassword).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Recover password page' });
    });
  });

  describe('POST /reset/:token', () => {
    it('should call passwordResetController.postRecoverPassword and return 200', async () => {
      const response = await request(app)
        .post('/reset/test-token-123')
        .send({ password: 'newpass123', confirmPassword: 'newpass123' })
        .expect(200);

      expect(passwordResetController.postRecoverPassword).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Password recovered' });
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

  describe('GET /dashboard', () => {
    it('should call dashboardController.getDashboard and return 200', async () => {
      const response = await request(app).get('/dashboard').expect(200);

      expect(dashboardController.getDashboard).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Dashboard page' });
    });
  });

  describe('GET /inspections/:id', () => {
    it('should call dashboardController.getInspection and return 200 when authenticated', async () => {
      const response = await request(app)
        .get('/inspections/abc123')
        .set('x-test-auth', 'true')
        .expect(200);

      expect(dashboardController.getInspection).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Inspection data' });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/inspections/abc123')
        .expect(401);

      expect(dashboardController.getInspection).not.toHaveBeenCalled();
    });
  });

  describe('GET /profile', () => {
    it('should call profileController.getProfile and return 200', async () => {
      const response = await request(app).get('/profile').expect(200);

      expect(profileController.getProfile).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Profile page' });
    });
  });

  describe('POST /profile/photo', () => {
    it('should call profileController.updatePhoto and return 200', async () => {
      const response = await request(app)
        .post('/profile/photo')
        .expect(200);

      expect(profileController.updatePhoto).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Photo updated' });
    });
  });

  describe('DELETE /profile/delete', () => {
    it('should call profileController.deleteAccount and return 200', async () => {
      const response = await request(app)
        .delete('/profile/delete')
        .expect(200);

      expect(profileController.deleteAccount).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Account deleted' });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for a route that does not exist', async () => {
      await request(app).get('/nonexistent').expect(404);
    });
  });
});
