const request = require('supertest');
const express = require('express');
const contactRoutes = require('../../../routes/contact');

jest.mock('../../../controllers/contact', () => ({
  submit: jest.fn((req, res) => {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(200).send('Message sent successfully!');
    }
    return res.redirect('/?contact_success=1');
  })
}));

// Import the mocked controller
const contactController = require('../../../controllers/contact');

describe('Contact Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Setup body parser
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Import and use the contact routes
    app.use('/contact', contactRoutes);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /contact/submit', () => {
    it('should call contactController.submit', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      };

      const response = await request(app)
        .post('/contact/submit')
        .set('Content-Type', 'application/json')
        .send(contactData)
        .expect(200);

      expect(contactController.submit).toHaveBeenCalledTimes(1);
      expect(response.text).toBe('Message sent successfully!');
    });

    it('should pass contact data to controller', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      };

      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
    });

    it('should handle different content types', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      };

      // Test with JSON content type
      await request(app)
        .post('/contact/submit')
        .set('Content-Type', 'application/json')
        .send(contactData)
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
      expect(mockCall[0].headers['content-type']).toBe('application/json');
    });

    it('should handle form data', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message content'
      };

      // Test with form data - should redirect
      await request(app)
        .post('/contact/submit')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(contactData)
        .expect(302); // Redirect status code

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
    });

    it('should handle empty request body', async () => {
      await request(app)
        .post('/contact/submit')
        .send({})
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual({});
    });

    it('should handle malformed JSON', async () => {
      // This should be handled by Express body parser
      await request(app)
        .post('/contact/submit')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400); // Express should return 400 for malformed JSON
    });

    it('should handle large payloads', async () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: largeMessage
      };

      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
    });

    it('should handle special characters in data', async () => {
      const contactData = {
        name: 'José María',
        email: 'test+tag@example.com',
        subject: 'Special chars: !@#$%^&*()',
        message: 'Message with émojis 🚀 and <script>tags</script>'
      };

      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
    });
  });

  describe('Route not found', () => {
    it('should return 404 for non-existent contact routes', async () => {
      await request(app)
        .get('/contact/nonexistent')
        .expect(404);

      await request(app)
        .put('/contact/submit')
        .expect(404);

      await request(app)
        .delete('/contact/submit')
        .expect(404);
    });
  });

  describe('HTTP method validation', () => {
    it('should only accept POST for /contact/submit', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };

      // POST should work
      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(200);

      // Other methods should fail
      await request(app)
        .get('/contact/submit')
        .expect(404);

      await request(app)
        .put('/contact/submit')
        .send(contactData)
        .expect(404);

      await request(app)
        .patch('/contact/submit')
        .send(contactData)
        .expect(404);

      await request(app)
        .delete('/contact/submit')
        .expect(404);
    });
  });

  describe('Request headers', () => {
    it('should handle various request headers', async () => {
      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };

      await request(app)
        .post('/contact/submit')
        .set('User-Agent', 'Test Browser')
        .set('Accept', 'application/json')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(contactData)
        .expect(200);

      const mockCall = contactController.submit.mock.calls[0];
      expect(mockCall[0].body).toEqual(contactData);
      expect(mockCall[0].headers['user-agent']).toBe('Test Browser');
      expect(mockCall[0].headers['accept']).toBe('application/json');
      expect(mockCall[0].headers['x-requested-with']).toBe('XMLHttpRequest');
    });
  });

  describe('Error handling', () => {
    it('should handle controller errors gracefully', async () => {
      // Override the mocked controller to simulate an error
      contactController.submit.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };

      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(500);

      expect(contactController.submit).toHaveBeenCalledTimes(1);
    });

    it('should handle async controller errors', async () => {
      // Override the mocked controller to simulate an async error
      contactController.submit.mockImplementation(async (req, res) => {
        res.status(500).json({ error: 'Async error occurred' });
      });

      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };

      await request(app)
        .post('/contact/submit')
        .send(contactData)
        .expect(500);
    });
  });

  describe('Request timing', () => {
    it('should handle multiple rapid requests', async () => {
      // Reset the mock to ensure it's in a clean state
      jest.clearAllMocks();
      
      // Ensure the mock returns the expected response
      contactController.submit.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Contact submitted' });
      });

      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      };

      // Send multiple requests rapidly
      const promises = Array(5).fill().map(() => 
        request(app)
          .post('/contact/submit')
          .send(contactData)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Controller should be called for each request
      expect(contactController.submit).toHaveBeenCalledTimes(5);
    });
  });
}); 