const crypto = require('crypto');
const mongoose = require('mongoose');
const resetController = require('../../../controllers/reset');
const User = require('../../../models/User');
const { validateForgot, validateReset } = require('../../../middleware/validators');
const runValidators = require('../helpers/runValidators');


jest.mock('../../../models/User');

// Mock mailer — no real emails sent during tests.
// We capture the sendMail mock once so every test references the same instance
// that the controller calls internally.
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

jest.mock('../../../utils/mailer', () => ({
    createTransporter: jest.fn(() => ({
        sendMail: mockSendMail
    }))
}));

// ─────────────────────────────────────────────
// postPasswordReset
// ─────────────────────────────────────────────
describe('resetController.postPasswordReset', () => {
    let req, res, next;
    const originalBaseUrl = process.env.BASE_URL;

    // Runs the route's validators, then the controller
    const postPasswordReset = async () => {
        await runValidators(validateForgot, req);
        await resetController.postPasswordReset(req, res, next);
    };

    beforeEach(() => {
        process.env.BASE_URL = 'https://pretriq.test';
        req = {
            user: null,
            body: { email: 'test@example.com' },
            flash: jest.fn(),
            headers: { host: 'localhost:3000' },
            session: { save: jest.fn(cb => cb(null)) },
        };
        res = { redirect: jest.fn() };
        next = jest.fn();
        mockSendMail.mockResolvedValue({ messageId: 'test-id' });
    });

    afterEach(() => {
        jest.clearAllMocks();
        if (originalBaseUrl === undefined) {
            delete process.env.BASE_URL;
        } else {
            process.env.BASE_URL = originalBaseUrl;
        }
    });

    it('should flash errors and redirect to /forgot when email is invalid', async () => {
        req.body.email = 'not-an-email';

        await postPasswordReset();

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should flash errors instead of failing when the email is missing', async () => {
        delete req.body.email;

        await postPasswordReset();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter a valid email address.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
        expect(next).not.toHaveBeenCalled();
    });

    // An unregistered address must be indistinguishable from a registered one,
    // or this form becomes a way to discover which emails have accounts.
    it('should give an unregistered email the same response as a registered one', async () => {
        User.findOne.mockResolvedValue(null);

        await postPasswordReset();

        expect(req.flash).toHaveBeenCalledWith('info', expect.any(Array));
        expect(req.flash).not.toHaveBeenCalledWith('errors', expect.any(Array));
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should not send any email when the address is not registered', async () => {
        User.findOne.mockResolvedValue(null);

        await postPasswordReset();

        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should normalise the email before looking it up', async () => {
        req.body.email = 'TEST@Example.COM';
        User.findOne.mockResolvedValue(null);

        await postPasswordReset();

        // Mongoose does not run the schema's lowercase setter on query filters,
        // so the controller must normalise or a differently-cased address
        // silently finds nothing and the reset never arrives.
        expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should save token to user, send email, flash info, and redirect on valid email', async () => {
        const mockUser = {
            email: 'test@example.com',
            resetPasswordToken: null,
            resetPasswordExpires: null,
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        await postPasswordReset();

        // Token and expiry were set on the user document
        expect(mockUser.resetPasswordToken).toBeDefined();
        expect(mockUser.resetPasswordExpires).toBeGreaterThan(Date.now());
        expect(mockUser.save).toHaveBeenCalled();

        // Email was sent
        expect(mockSendMail).toHaveBeenCalled();

        // Info flash and redirect
        expect(req.flash).toHaveBeenCalledWith('info', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    // A link built from the Host header would let anyone send a real reset
    // email whose link points at their own server.
    it('should build the reset link from BASE_URL and ignore the Host header', async () => {
        req.headers.host = 'attacker.example';
        const mockUser = {
            email: 'test@example.com',
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        await postPasswordReset();

        const { html } = mockSendMail.mock.calls[0][0];
        // BASE_URL, then /reset/, then the 40-character hex token
        expect(html).toMatch(/href="https:\/\/pretriq\.test\/reset\/[0-9a-f]{40}"/);
        expect(html).not.toContain('attacker.example');
    });

    it('should call next with an error and send nothing when BASE_URL is not set', async () => {
        delete process.env.BASE_URL;
        const mockUser = {
            email: 'test@example.com',
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        await postPasswordReset();

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(mockUser.save).not.toHaveBeenCalled();
        expect(mockSendMail).not.toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should call next with error if User.findOne throws', async () => {
        const error = new Error('db error');
        User.findOne.mockRejectedValue(error);

        await postPasswordReset();

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should call next with error if sendMail throws', async () => {
        const mockUser = {
            email: 'test@example.com',
            resetPasswordToken: null,
            resetPasswordExpires: null,
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        const error = new Error('smtp error');
        mockSendMail.mockRejectedValueOnce(error);

        await postPasswordReset();

        expect(next).toHaveBeenCalledWith(error);
    });
});

// ─────────────────────────────────────────────
// getRecoverPassword
// ─────────────────────────────────────────────
describe('resetController.getRecoverPassword', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { token: 'abc123' },
            flash: jest.fn(),
            session: { save: jest.fn(cb => cb(null)) },
        };
        res = { render: jest.fn(), redirect: jest.fn() };
        next = jest.fn();
        User.findOne.mockResolvedValue({ email: 'test@example.com' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render recover.ejs with the token when the link is valid', async () => {
        await resetController.getRecoverPassword(req, res, next);

        expect(res.render).toHaveBeenCalledWith('recover.ejs', { token: 'abc123' });
    });

    it('should look the link up by the hash of its token', async () => {
        await resetController.getRecoverPassword(req, res, next);

        const hash = crypto.createHash('sha256').update('abc123').digest('hex');
        expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({ resetPasswordToken: hash }));
    });

    // sanitizeFilter (config/database.js) rewrites any operator that isn't
    // wrapped in mongoose.trusted(), which would break the expiry check
    it('should build an expiry check that survives sanitizeFilter', async () => {
        await resetController.getRecoverPassword(req, res, next);

        const filter = User.findOne.mock.calls[0][0];
        const sanitized = mongoose.sanitizeFilter({ ...filter });
        // An untrusted operator comes back wrapped as { $eq: { $gt: ... } }
        expect(sanitized.resetPasswordExpires).not.toHaveProperty('$eq');
        expect(sanitized.resetPasswordExpires.$gt).toEqual(expect.any(Number));
    });

    it('should send an unknown or expired link to /forgot without showing the form', async () => {
        User.findOne.mockResolvedValue(null);

        await resetController.getRecoverPassword(req, res, next);

        expect(res.render).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Password reset token is invalid or has expired.' }]);
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should call next with error if render throws', async () => {
        res.render.mockImplementation(() => { throw new Error('render failed') });

        await resetController.getRecoverPassword(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────
// postRecoverPassword
// ─────────────────────────────────────────────
describe('resetController.postRecoverPassword', () => {
    let req, res, next;

    // Runs the route's validators, then the controller
    const postRecoverPassword = async () => {
        await runValidators(validateReset, req);
        await resetController.postRecoverPassword(req, res, next);
    };

    beforeEach(() => {
        req = {
            user: null,
            body: { password: 'newpass123', confirmPassword: 'newpass123' },
            params: { token: 'abc123' },
            flash: jest.fn(),
            login: jest.fn((user, cb) => cb(null)),
            session: { save: jest.fn(cb => cb(null)) },
        };
        res = { redirect: jest.fn() };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should flash errors and redirect to the reset form when password is too short', async () => {
        req.body.password = 'ab';
        req.body.confirmPassword = 'ab';

        await postRecoverPassword();

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/reset/abc123');
    });

    it('should flash errors and redirect to the reset form when passwords do not match', async () => {
        req.body.confirmPassword = 'different';

        await postRecoverPassword();

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/reset/abc123');
    });

    it('should flash errors instead of failing when the password is not text', async () => {
        req.body.password = { length: 9 };

        await postRecoverPassword();

        expect(req.flash).toHaveBeenCalledWith('errors', expect.arrayContaining([
            { msg: 'Password must be at least 8 characters long.' },
        ]));
        expect(res.redirect).toHaveBeenCalledWith('/reset/abc123');
        expect(next).not.toHaveBeenCalled();
    });

    it('should flash errors and redirect to /forgot when token is invalid or expired', async () => {
        // findOne returns null — token not found or expired
        User.findOne.mockResolvedValue(null);

        await postRecoverPassword();

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should reset password, log user in, flash success, and redirect to / on valid token', async () => {
        const mockUser = {
            password: 'oldpassword',
            resetPasswordToken: 'abc123',
            resetPasswordExpires: Date.now() + 3600000,
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        await postRecoverPassword();

        // Password updated and token fields cleared
        expect(mockUser.password).toBe('newpass123');
        expect(mockUser.resetPasswordToken).toBeUndefined();
        expect(mockUser.resetPasswordExpires).toBeUndefined();
        expect(mockUser.save).toHaveBeenCalled();

        // Other devices get signed out (endStaleSessions), this one stays in
        expect(mockUser.passwordChangedAt).toBeInstanceOf(Date);
        expect(req.session.loginAt).toBeGreaterThanOrEqual(mockUser.passwordChangedAt.getTime());

        // Logged in, flashed, redirected
        expect(req.login).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/');
    });

    it('should call next with error if User.findOne throws', async () => {
        const error = new Error('db error');
        User.findOne.mockRejectedValue(error);

        await postRecoverPassword();

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});
