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
