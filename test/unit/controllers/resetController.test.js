const resetController = require('../../../controllers/reset');
const User = require('../../../models/User');


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

    beforeEach(() => {
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
    });

    it('should flash errors and redirect to /forgot when email is invalid', async () => {
        req.body.email = 'not-an-email';

        await resetController.postPasswordReset(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should flash errors and redirect to /forgot when email is not registered', async () => {
        User.findOne.mockResolvedValue(null);

        await resetController.postPasswordReset(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/forgot');
    });

    it('should save token to user, send email, flash info, and redirect on valid email', async () => {
        const mockUser = {
            email: 'test@example.com',
            resetPasswordToken: null,
            resetPasswordExpires: null,
            save: jest.fn().mockResolvedValue(),
        };
        User.findOne.mockResolvedValue(mockUser);

        await resetController.postPasswordReset(req, res, next);

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

    it('should call next with error if User.findOne throws', async () => {
        const error = new Error('db error');
        User.findOne.mockRejectedValue(error);

        await resetController.postPasswordReset(req, res, next);

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

        await resetController.postPasswordReset(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

// ─────────────────────────────────────────────
// getRecoverPassword
// ─────────────────────────────────────────────
describe('resetController.getRecoverPassword', () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: { token: 'abc123' } };
        res = { render: jest.fn(), redirect: jest.fn() };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render recover.ejs with the token', async () => {
        await resetController.getRecoverPassword(req, res, next);

        expect(res.render).toHaveBeenCalledWith('recover.ejs', { token: 'abc123' });
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

    it('should flash errors and redirect back when password is too short', async () => {
        req.body.password = 'ab';
        req.body.confirmPassword = 'ab';

        await resetController.postRecoverPassword(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('back');
    });

    it('should flash errors and redirect back when passwords do not match', async () => {
        req.body.confirmPassword = 'different';

        await resetController.postRecoverPassword(req, res, next);

        expect(req.flash).toHaveBeenCalledWith('errors', expect.any(Array));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('back');
    });

    it('should flash errors and redirect to /forgot when token is invalid or expired', async () => {
        // findOne returns null — token not found or expired
        User.findOne.mockResolvedValue(null);

        await resetController.postRecoverPassword(req, res, next);

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

        await resetController.postRecoverPassword(req, res, next);

        // Password updated and token fields cleared
        expect(mockUser.password).toBe('newpass123');
        expect(mockUser.resetPasswordToken).toBeUndefined();
        expect(mockUser.resetPasswordExpires).toBeUndefined();
        expect(mockUser.save).toHaveBeenCalled();

        // Logged in, flashed, redirected
        expect(req.login).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/');
    });

    it('should call next with error if User.findOne throws', async () => {
        const error = new Error('db error');
        User.findOne.mockRejectedValue(error);

        await resetController.postRecoverPassword(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});
