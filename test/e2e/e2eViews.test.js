const request = require('supertest');
const { createTestServer, cleanupTestServer } = require('../setup/testServer');

// Set Jest timeout for all tests in this file
jest.setTimeout(30000); // 30 seconds max per test

describe('E2E Views Testing', () => {
  let app;

  beforeAll(async () => {
    // Create test server with shorter timeout
    try {
      app = await Promise.race([
        createTestServer(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server creation timeout')), 8000)
        )
      ]);
    } catch (error) {
      console.log('⚠️ Server creation failed:', error.message);
      throw error;
    }
  }, 10000); // 10 second timeout for beforeAll

  afterAll(async () => {
    try {
      await Promise.race([
        cleanupTestServer(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
        )
      ]);
    } catch (error) {
      console.log('⚠️ Test cleanup failed:', error.message);
    }
  }, 8000); // 8 second timeout for afterAll

  describe('Public Pages', () => {
    it('should render homepage with all sections', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Pretriq');
      expect(response.text).toContain("Driver's Vehicle Inspection Report");
      expect(response.text).toContain('Start Inspection');
      expect(response.text).toContain('Features');
      expect(response.text).toContain('Contact');
    });

    it('should render login page with form', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('Login');
      expect(response.text).toContain('email');
      expect(response.text).toContain('password');
      expect(response.text).toContain('Submit');
    });

    it('should render signup page with form', async () => {
      const response = await request(app)
        .get('/signup')
        .expect(200);

      expect(response.text).toContain('Create an account');
      expect(response.text).toContain('email');
      expect(response.text).toContain('password');
      expect(response.text).toContain('Submit');
    });

    it('should render forgot password page', async () => {
      const response = await request(app)
        .get('/forgot')
        .expect(200);

      expect(response.text).toContain('Reset your password');
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

      expect(response.text).toContain('Terms of Use');
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

  describe('Basic Navigation', () => {
    it('should redirect protected routes when not authenticated', async () => {
      const response = await request(app)
        .get('/todos')
        .expect(302);

      // Should redirect to home or login
      expect(response.headers.location).toMatch(/\/(login|$)/);
    });

    it('should redirect profile route when not authenticated', async () => {
      const response = await request(app)
        .get('/profile')
        .expect(302);

      // Should redirect to home or login
      expect(response.headers.location).toMatch(/\/(login|$)/);
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('should include proper meta tags', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<meta charset="UTF-8">');
      expect(response.text).toContain('viewport');
    });

    it('should include proper semantic HTML', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<main class="index-main">');
      expect(response.text).toContain('<header class="partial-header"');
      expect(response.text).toContain('<footer class="page-footer"');
    });

    it('should include proper ARIA labels', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('aria-label');
      expect(response.text).toContain('role=');
    });
  });

  describe('Form Structure', () => {
    it('should have proper form structure on signup page', async () => {
      const response = await request(app)
        .get('/signup')
        .expect(200);

      expect(response.text).toContain('<form');
      expect(response.text).toContain('action="/signup"');
      expect(response.text).toContain('method="POST"');
    });

    it('should have proper form structure on login page', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('<form');
      expect(response.text).toContain('action="/login"');
      expect(response.text).toContain('method="POST"');
    });

    it('should have proper form structure on contact page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('contact-form');
      expect(response.text).toContain('action="/contact/submit"');
    });
  });
}); 