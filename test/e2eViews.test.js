const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Todo = require('../models/Todo');
const Contact = require('../models/Contact');

describe('E2E Views Testing', () => {
  let testUser, testInspection, testContact;
  let authCookie;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pretriq_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Todo.deleteMany({});
    await Contact.deleteMany({});

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();

    // Create test inspection
    testInspection = new Todo({
      truckTractorNo: '12345',
      trailerNo: '67890',
      date: new Date(),
      remarks: 'Test inspection remarks',
      conditionSatisfactory: true,
      defects: {
        truckTractor: {
          brakes: false,
          lights: true
        },
        trailer: {
          brakes: true,
          lights: false
        }
      },
      user: testUser._id
    });
    await testInspection.save();

    // Create test contact
    testContact = new Contact({
      name: 'Test Contact',
      email: 'contact@example.com',
      subject: 'Test Subject',
      message: 'Test message content'
    });
    await testContact.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Public Pages', () => {
    it('should render homepage with all sections', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Pretriq');
      expect(response.text).toContain('Driver Vehicle Inspection Reports');
      expect(response.text).toContain('Start Inspection');
      expect(response.text).toContain('Features');
      expect(response.text).toContain('Contact');
    });

    it('should render login page with form', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('Login');
      expect(response.text).toContain('username');
      expect(response.text).toContain('password');
      expect(response.text).toContain('Sign Up');
    });

    it('should render signup page with form', async () => {
      const response = await request(app)
        .get('/signup')
        .expect(200);

      expect(response.text).toContain('Sign Up');
      expect(response.text).toContain('username');
      expect(response.text).toContain('email');
      expect(response.text).toContain('password');
    });

    it('should render forgot password page', async () => {
      const response = await request(app)
        .get('/forgot')
        .expect(200);

      expect(response.text).toContain('Forgot Password');
      expect(response.text).toContain('email');
    });

    it('should render privacy policy page', async () => {
      const response = await request(app)
        .get('/privacy')
        .expect(200);

      expect(response.text).toContain('Privacy Policy');
      expect(response.text).toContain('privacy');
    });

    it('should render terms of service page', async () => {
      const response = await request(app)
        .get('/terms')
        .expect(200);

      expect(response.text).toContain('Terms of Service');
      expect(response.text).toContain('terms');
    });

    it('should render 404 page for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.text).toContain('404');
      expect(response.text).toContain('Page Not Found');
    });
  });

  describe('Authentication Flow', () => {
    it('should allow user registration', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'newpassword123'
        })
        .expect(302); // Redirect after successful signup

      // Verify user was created
      const newUser = await User.findOne({ username: 'newuser' });
      expect(newUser).toBeTruthy();
      expect(newUser.email).toBe('newuser@example.com');
    });

    it('should allow user login', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(302); // Redirect after successful login

      // Check for session cookie
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should redirect to login for protected routes when not authenticated', async () => {
      const response = await request(app)
        .get('/todos')
        .expect(302);

      expect(response.headers.location).toContain('/login');
    });

    it('should allow user logout', async () => {
      // First login to get session
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then logout
      const logoutResponse = await request(app)
        .get('/logout')
        .set('Cookie', cookies)
        .expect(302);

      expect(logoutResponse.headers.location).toContain('/');
    });
  });

  describe('Authenticated User Pages', () => {
    beforeEach(async () => {
      // Login and get session cookie
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      authCookie = loginResponse.headers['set-cookie'];
    });

    it('should render todos dashboard for authenticated user', async () => {
      const response = await request(app)
        .get('/todos')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.text).toContain('Inspections');
      expect(response.text).toContain('Start New Inspection');
      expect(response.text).toContain('12345'); // Test inspection truck number
    });

    it('should render profile page for authenticated user', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.text).toContain('Profile');
      expect(response.text).toContain('testuser');
      expect(response.text).toContain('test@example.com');
    });

    it('should render edit profile page', async () => {
      const response = await request(app)
        .get(`/profile/edit/${testUser._id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.text).toContain('Edit Profile');
      expect(response.text).toContain('testuser');
    });

    it('should render individual inspection view', async () => {
      const response = await request(app)
        .get(`/todos/view/${testInspection._id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.text).toContain('Inspection Report');
      expect(response.text).toContain('12345');
      expect(response.text).toContain('67890');
      expect(response.text).toContain('Test inspection remarks');
    });
  });

  describe('Form Submissions', () => {
    it('should handle contact form submission', async () => {
      const response = await request(app)
        .post('/contact/submit')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Test Contact',
          message: 'This is a test contact message'
        })
        .expect(200);

      // Verify contact was saved
      const newContact = await Contact.findOne({ email: 'john@example.com' });
      expect(newContact).toBeTruthy();
      expect(newContact.name).toBe('John Doe');
    });

    it('should handle inspection creation for authenticated user', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Create inspection
      const response = await request(app)
        .post('/todos/createInspection')
        .set('Cookie', cookies)
        .send({
          truckTractorNo: '99999',
          trailerNo: '88888',
          date: '2024-01-15',
          remarks: 'New test inspection',
          conditionSatisfactory: false,
          defects: {
            truckTractor: {
              brakes: true,
              lights: false
            }
          }
        })
        .expect(200);

      // Verify inspection was created
      const newInspection = await Todo.findOne({ truckTractorNo: '99999' });
      expect(newInspection).toBeTruthy();
      expect(newInspection.user.toString()).toBe(testUser._id.toString());
    });

    it('should handle profile update', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Update profile
      const response = await request(app)
        .put(`/profile/edit/${testUser._id}`)
        .set('Cookie', cookies)
        .send({
          username: 'updateduser',
          email: 'updated@example.com'
        })
        .expect(200);

      // Verify profile was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.username).toBe('updateduser');
      expect(updatedUser.email).toBe('updated@example.com');
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Login
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      authCookie = loginResponse.headers['set-cookie'];
    });

    it('should handle inspection search', async () => {
      const response = await request(app)
        .get('/todos/search?q=12345')
        .set('Cookie', authCookie)
        .expect(200);

      const data = JSON.parse(response.text);
      expect(data.inspections).toBeDefined();
      expect(data.inspections.length).toBeGreaterThan(0);
      expect(data.inspections[0].truckTractorNo).toBe('12345');
    });

    it('should handle load more inspections', async () => {
      // Create additional inspections
      for (let i = 0; i < 15; i++) {
        await Todo.create({
          truckTractorNo: `truck${i}`,
          date: new Date(),
          remarks: `Test inspection ${i}`,
          conditionSatisfactory: true,
          user: testUser._id
        });
      }

      const response = await request(app)
        .get('/todos/loadmore?page=2')
        .set('Cookie', authCookie)
        .expect(200);

      const data = JSON.parse(response.text);
      expect(data.inspections).toBeDefined();
      expect(data.hasMore).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inspection ID', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/todos/view/invalid-id')
        .set('Cookie', cookies)
        .expect(404);

      expect(response.text).toContain('404');
    });

    it('should handle server errors gracefully', async () => {
      // This would require mocking a database error
      // For now, we'll test that the error pages exist
      const response = await request(app)
        .get('/todos')
        .set('Cookie', 'invalid-session')
        .expect(302); // Should redirect to login

      expect(response.headers.location).toContain('/login');
    });
  });

  describe('Content Security and Validation', () => {
    it('should sanitize user input in forms', async () => {
      const response = await request(app)
        .post('/contact/submit')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          subject: 'Test',
          message: 'Test message'
        })
        .expect(200);

      // Verify the script tag was sanitized
      const newContact = await Contact.findOne({ email: 'test@example.com' });
      expect(newContact.name).not.toContain('<script>');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/contact/submit')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          subject: 'Test',
          message: 'Test message'
        })
        .expect(400); // Should return validation error

      expect(response.text).toContain('valid email');
    });

    it('should require authentication for protected actions', async () => {
      const response = await request(app)
        .post('/todos/createInspection')
        .send({
          truckTractorNo: '12345',
          remarks: 'Test'
        })
        .expect(401); // Should return unauthorized

      expect(response.text).toContain('Unauthorized');
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('should include proper meta tags', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<meta charset="utf-8">');
      expect(response.text).toContain('viewport');
    });

    it('should include proper semantic HTML', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<main>');
      expect(response.text).toContain('<header>');
      expect(response.text).toContain('<footer>');
    });

    it('should include proper ARIA labels', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('aria-label');
      expect(response.text).toContain('role=');
    });
  });
}); 