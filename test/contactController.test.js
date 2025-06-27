const contactController = require('../controllers/contact');
const Contact = require('../models/Contact');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../models/Contact');

describe('contactController.submit', () => {
  let req, res;
  beforeEach(() => {
    req = {
      body: {
        name: 'Test <User>',
        email: 'Test@Email.com',
        subject: 'Test <Subject>',
        message: 'Hello <World>'
      },
      headers: { 'content-type': 'application/json' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 400 if any field is missing (JSON)', async () => {
    req.body.name = '';
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('All fields are required');
  });

  it('should redirect if any field is missing (form)', async () => {
    req.headers['content-type'] = 'text/html';
    req.body.subject = '';
    await contactController.submit(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/?contact_error=missing_fields');
  });

  it('should return 400 if email is invalid (JSON)', async () => {
    req.body.email = 'bademail';
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Please provide a valid email address');
  });

  it('should redirect if email is invalid (form)', async () => {
    req.headers['content-type'] = 'text/html';
    req.body.email = 'bademail';
    await contactController.submit(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/?contact_error=invalid_email');
  });

  it('should sanitize input and save to DB', async () => {
    Contact.create.mockResolvedValue({});
    await contactController.submit(req, res);
    expect(Contact.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test User',
      email: 'test@email.com',
      subject: 'Test Subject',
      message: 'Hello World'
    }));
  });

  it('should not fail if email sending throws', async () => {
    Contact.create.mockResolvedValue({});
    // No need to mock sendAdminNotification/sendUserConfirmation, nodemailer is mocked
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Message sent successfully!');
  });

  it('should return 200 and success message (JSON)', async () => {
    Contact.create.mockResolvedValue({});
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Message sent successfully!');
  });

  it('should redirect with success (form)', async () => {
    req.headers['content-type'] = 'text/html';
    Contact.create.mockResolvedValue({});
    await contactController.submit(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/?contact_success=1');
  });

  it('should handle duplicate error (code 11000, JSON)', async () => {
    Contact.create.mockRejectedValue({ code: 11000 });
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('This message appears to be a duplicate. Please wait a moment before submitting again.');
  });

  it('should handle duplicate error (code 11000, form)', async () => {
    req.headers['content-type'] = 'text/html';
    Contact.create.mockRejectedValue({ code: 11000 });
    await contactController.submit(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/?contact_error=duplicate');
  });

  it('should handle server error (JSON)', async () => {
    Contact.create.mockRejectedValue(new Error('fail'));
    await contactController.submit(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('An error occurred while sending your message. Please try again.');
  });

  it('should handle server error (form)', async () => {
    req.headers['content-type'] = 'text/html';
    Contact.create.mockRejectedValue(new Error('fail'));
    await contactController.submit(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/?contact_error=server_error');
  });
}); 