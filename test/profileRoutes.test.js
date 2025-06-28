const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { ensureAuth } = require('../middleware/auth');
const upload = require('../middleware/multer');
const profileController = require('../controllers/profile');

jest.mock('../middleware/auth', () => ({
  ensureAuth: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }),
  ensureGuest: jest.fn((req, res, next) => {
    next();
  })
}));

jest.mock('../middleware/multer', () => ({
  single: jest.fn(() => (req, res, next) => {
    req.file = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 12345,
      destination: '/tmp/',
      filename: 'test-image-123.jpg',
      path: '/tmp/test-image-123.jpg'
    };
    next();
  })
}));

jest.mock('../controllers/profile', () => ({
  getProfile: jest.fn((req, res) => res.status(200).json({ message: 'Profile page' })),
  editProfile: jest.fn((req, res) => res.status(200).json({ message: 'Edit profile page' })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ message: 'Profile updated' })),
  updatePhoto: jest.fn((req, res) => res.status(200).json({ message: 'Photo updated' })),
  deleteProfile: jest.fn((req, res) => res.status(200).json({ message: 'Profile deleted' }))
}));

describe('Profile Routes', () => {
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
    
    const profileRoutes = require('../routes/profile');
    app.use('/profile', profileRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /profile', () => {
    it('should call ensureAuth middleware and profileController.getProfile', async () => {
      const response = await request(app)
        .get('/profile')
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(profileController.getProfile).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Profile page' });
    });

    it('should pass user object to controller', async () => {
      await request(app)
        .get('/profile')
        .expect(200);

      const mockCall = profileController.getProfile.mock.calls[0];
      expect(mockCall[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('GET /profile/edit/:id', () => {
    it('should call ensureAuth middleware and profileController.editProfile', async () => {
      const userId = 'test-user-id';

      const response = await request(app)
        .get(`/profile/edit/${userId}`)
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(profileController.editProfile).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Edit profile page' });
    });

    it('should pass user ID parameter to controller', async () => {
      const userId = 'test-user-id';

      await request(app)
        .get(`/profile/edit/${userId}`)
        .expect(200);

      const mockCall = profileController.editProfile.mock.calls[0];
      expect(mockCall[0].params.id).toBe(userId);
      expect(mockCall[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('PUT /profile/edit/:id', () => {
    it('should call ensureAuth middleware and profileController.updateProfile', async () => {
      const userId = 'test-user-id';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/profile/edit/${userId}`)
        .send(updateData)
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(profileController.updateProfile).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Profile updated' });
    });

    it('should pass user ID and update data to controller', async () => {
      const userId = 'test-user-id';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      await request(app)
        .put(`/profile/edit/${userId}`)
        .send(updateData)
        .expect(200);

      const mockCall = profileController.updateProfile.mock.calls[0];
      expect(mockCall[0].params.id).toBe(userId);
      expect(mockCall[0].body).toEqual(updateData);
      expect(mockCall[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('POST /profile', () => {
    it('should call ensureAuth middleware and profileController.updatePhoto', async () => {
      const response = await request(app)
        .post('/profile')
        .attach('file', Buffer.from('fake image data'), 'test-image.jpg')
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(profileController.updatePhoto).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Photo updated' });
    });

    it('should pass file data to controller', async () => {
      await request(app)
        .post('/profile')
        .attach('file', Buffer.from('fake image data'), 'test-image.jpg')
        .expect(200);

      const mockCall = profileController.updatePhoto.mock.calls[0];
      expect(mockCall[0].file.fieldname).toBe('file');
      expect(mockCall[0].file.originalname).toBe('test-image.jpg');
      expect(mockCall[0].file.mimetype).toBe('image/jpeg');
      expect(mockCall[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('DELETE /profile/delete/:id', () => {
    it('should call ensureAuth middleware and profileController.deleteProfile', async () => {
      const userId = 'test-user-id';

      const response = await request(app)
        .delete(`/profile/delete/${userId}`)
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(profileController.deleteProfile).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Profile deleted' });
    });

    it('should pass user ID parameter to controller', async () => {
      const userId = 'test-user-id';

      await request(app)
        .delete(`/profile/delete/${userId}`)
        .expect(200);

      const mockCall = profileController.deleteProfile.mock.calls[0];
      expect(mockCall[0].params.id).toBe(userId);
      expect(mockCall[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('Middleware execution order', () => {
    it('should execute ensureAuth before controller', async () => {
      const executionOrder = [];
      
      // Reset mocks for this specific test
      jest.clearAllMocks();
      
      ensureAuth.mockImplementation((req, res, next) => {
        executionOrder.push('ensureAuth');
        req.user = { id: 'test-user-id' };
        next();
      });

      profileController.updatePhoto.mockImplementation((req, res) => {
        executionOrder.push('controller');
        res.status(200).json({ message: 'Photo updated' });
      });

      await request(app)
        .post('/profile')
        .attach('file', Buffer.from('fake data'), 'test.jpg')
        .expect(200);

      // We can reliably test that ensureAuth runs before the controller
      expect(executionOrder).toEqual(['ensureAuth', 'controller']);
    });
  });

  describe('Authentication failure', () => {
    it('should handle authentication failure', async () => {
      ensureAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/profile')
        .expect(401);
    });
  });
}); 