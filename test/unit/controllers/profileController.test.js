const profileController = require('../../../controllers/profile');
const User = require('../../../models/User');
const cloudinary = require('../../../middleware/cloudinary');

jest.mock('../../../models/User');
jest.mock('../../../models/Inspection');
jest.mock('../../../middleware/cloudinary', () => ({
    uploader: {
        upload:   jest.fn(),
        destroy:  jest.fn(),
    },
}));

// ─────────────────────────────────────────────
// getProfile
// ─────────────────────────────────────────────
describe('profileController.getProfile', () => {
    let req, res, next;

    beforeEach(() => {
        req = { user: { _id: 'user123', email: 'test@example.com' } };
        res = { render: jest.fn() };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render profile.ejs', async () => {
        await profileController.getProfile(req, res, next);

        expect(res.render).toHaveBeenCalledWith('profile.ejs');
    });

    it('should call next with error if render throws', async () => {
        res.render.mockImplementation(() => { throw new Error('render failed') });

        await profileController.getProfile(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────
// updatePhoto
// ─────────────────────────────────────────────
describe('profileController.updatePhoto', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { _id: 'user123', cloudinaryId: null },
            file: { path: '/tmp/upload.jpg' },
            flash: jest.fn(),
            session: { save: jest.fn(cb => cb(null)) },
        };
        res = { redirect: jest.fn() };
        next = jest.fn();

        cloudinary.uploader.upload.mockResolvedValue({
            secure_url: 'https://res.cloudinary.com/test/image.jpg',
            public_id: 'pretriq/abc123',
        });
        cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
        User.findByIdAndUpdate.mockResolvedValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should upload photo and update user when no existing image', async () => {
        await profileController.updatePhoto(req, res, next);

        expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
        expect(cloudinary.uploader.upload).toHaveBeenCalledWith('/tmp/upload.jpg', expect.any(Object));
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
            image: 'https://res.cloudinary.com/test/image.jpg',
            cloudinaryId: 'pretriq/abc123',
        });
        expect(req.flash).toHaveBeenCalledWith('success', expect.any(String));
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    it('should destroy existing Cloudinary asset before uploading new one', async () => {
        req.user.cloudinaryId = 'pretriq/old123';

        await profileController.updatePhoto(req, res, next);

        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('pretriq/old123');
        expect(cloudinary.uploader.upload).toHaveBeenCalled();
    });

    it('should call next with error if upload throws', async () => {
        const error = new Error('cloudinary error');
        cloudinary.uploader.upload.mockRejectedValue(error);

        await profileController.updatePhoto(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────
// deleteAccount
// ─────────────────────────────────────────────
describe('profileController.deleteAccount', () => {
    let req, res, next;

    beforeEach(() => {
        const Inspection = require('../../../models/Inspection');
        Inspection.deleteMany = jest.fn().mockResolvedValue({});

        req = {
            user: { _id: 'user123', cloudinaryId: null },
            logout: jest.fn(cb => cb(null)),
            session: { destroy: jest.fn(cb => cb(null)) },
        };
        res = { redirect: jest.fn() };
        next = jest.fn();

        cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
        User.findByIdAndDelete.mockResolvedValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should delete inspections, delete user, logout, destroy session, and redirect', async () => {
        const Inspection = require('../../../models/Inspection');

        await profileController.deleteAccount(req, res, next);

        expect(Inspection.deleteMany).toHaveBeenCalledWith({ userId: 'user123' });
        expect(User.findByIdAndDelete).toHaveBeenCalledWith('user123');
        expect(req.logout).toHaveBeenCalled();
        expect(req.session.destroy).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/');
    });

    it('should destroy Cloudinary asset if user has one', async () => {
        req.user.cloudinaryId = 'pretriq/abc123';

        await profileController.deleteAccount(req, res, next);

        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('pretriq/abc123');
    });

    it('should not call Cloudinary destroy if user has no image', async () => {
        await profileController.deleteAccount(req, res, next);

        expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should call next with error if User.findByIdAndDelete throws', async () => {
        const error = new Error('db error');
        User.findByIdAndDelete.mockRejectedValue(error);

        await profileController.deleteAccount(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should call next with error if req.logout fails', async () => {
        const error = new Error('logout error');
        req.logout = jest.fn(cb => cb(error));

        await profileController.deleteAccount(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────
// updateName (after validateProfileName, as on the route)
// ─────────────────────────────────────────────
describe('profileController.updateName', () => {
    const { validateProfileName } = require('../../../middleware/validators');
    const runValidators = require('../helpers/runValidators');
    let req, res, next;

    // Runs the route's validators, then the controller
    const updateName = async () => {
        await runValidators(validateProfileName, req);
        await profileController.updateName(req, res, next);
    };

    beforeEach(() => {
        req = {
            body: { name: '  Jordan Rivera  ' },
            user: { _id: 'user123', name: 'Old Name' },
            flash: jest.fn(),
            session: { save: jest.fn(cb => cb(null)) },
        };
        res = { redirect: jest.fn() };
        next = jest.fn();
        User.findByIdAndUpdate.mockResolvedValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should save the trimmed name, update req.user, flash success and go back to /profile', async () => {
        await updateName();

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { name: 'Jordan Rivera' });
        expect(req.user.name).toBe('Jordan Rivera');
        expect(req.flash).toHaveBeenCalledWith('success', 'Your name has been updated.');
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    it('should refuse an empty name', async () => {
        req.body.name = '   ';

        await updateName();

        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    it('should refuse a name that is not text', async () => {
        req.body.name = { first: 'Jordan' };

        await updateName();

        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name.' }]);
    });

    it('should refuse a name over 60 characters', async () => {
        req.body.name = 'A'.repeat(61);

        await updateName();

        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Name must be between 1 and 60 characters.' }]);
    });

    it('should call next with the error if the update fails', async () => {
        const error = new Error('db error');
        User.findByIdAndUpdate.mockRejectedValue(error);

        await updateName();

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────
// updatePassword (after validateProfilePassword, as on the route)
// ─────────────────────────────────────────────
describe('profileController.updatePassword', () => {
    const { validateProfilePassword } = require('../../../middleware/validators');
    const runValidators = require('../helpers/runValidators');
    let req, res, next, account;

    // Runs the route's validators, then the controller
    const updatePassword = async () => {
        await runValidators(validateProfilePassword, req);
        await profileController.updatePassword(req, res, next);
    };

    beforeEach(() => {
        // The stored account: its password is "current-pass"
        account = {
            _id: 'user123',
            comparePassword: jest.fn((candidate, cb) => cb(null, candidate === 'current-pass')),
            save: jest.fn().mockResolvedValue(),
        };
        User.findById.mockResolvedValue(account);
        req = {
            body: { currentPassword: 'current-pass', password: 'brand-new-pass', confirmPassword: 'brand-new-pass' },
            user: { _id: 'user123' },
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

    it('should change the password, sign out other devices and keep this session', async () => {
        const before = Date.now();

        await updatePassword();

        expect(account.password).toBe('brand-new-pass');
        expect(account.passwordChangedAt).toBeInstanceOf(Date);
        expect(account.save).toHaveBeenCalled();
        // A fresh login, recorded after the change, so endStaleSessions keeps this browser in
        expect(req.login).toHaveBeenCalledWith(account, expect.any(Function));
        expect(req.session.loginAt).toBeGreaterThanOrEqual(account.passwordChangedAt.getTime());
        expect(req.session.loginAt).toBeGreaterThanOrEqual(before);
        expect(req.flash).toHaveBeenCalledWith('success', expect.stringContaining('Your password has been changed.'));
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    it('should refuse a wrong current password without changing anything', async () => {
        req.body.currentPassword = 'guess';

        await updatePassword();

        expect(account.save).not.toHaveBeenCalled();
        expect(req.login).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Your current password is incorrect.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    it('should refuse a new password that is the same as the current one', async () => {
        req.body.password = 'current-pass';
        req.body.confirmPassword = 'current-pass';

        await updatePassword();

        expect(account.save).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Choose a new password that is different from your current one.' }]);
    });

    it('should check the form before looking at the account', async () => {
        req.body = { currentPassword: '', password: 'short', confirmPassword: 'other' };

        await updatePassword();

        expect(User.findById).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith('errors', [
            { msg: 'Please enter your current password.' },
            { msg: 'Password must be at least 8 characters long.' },
            { msg: 'Passwords do not match.' },
        ]);
        expect(res.redirect).toHaveBeenCalledWith('/profile');
    });

    // The flash goes into the session database, so it must never hold a password
    it('should flash only messages, never the submitted passwords', async () => {
        req.body = { currentPassword: 'current-pass', password: 'tiny', confirmPassword: 'tiny' };

        await updatePassword();

        expect(JSON.stringify(req.flash.mock.calls)).not.toContain('tiny');
        expect(JSON.stringify(req.flash.mock.calls)).not.toContain('current-pass');
    });

    it('should call next with the error if saving fails', async () => {
        const error = new Error('db error');
        account.save.mockRejectedValue(error);

        await updatePassword();

        expect(next).toHaveBeenCalledWith(error);
        expect(req.login).not.toHaveBeenCalled();
    });
});
