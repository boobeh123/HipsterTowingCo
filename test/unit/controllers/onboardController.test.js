const onboardController = require('../../../controllers/onboard');
const User = require('../../../models/User');
const { validateOnboard } = require('../../../middleware/validators');
const runValidators = require('../helpers/runValidators');

jest.mock('../../../models/User');

// ─────────────────────────────────────────────
// getOnboard
// ─────────────────────────────────────────────
describe('onboardController.getOnboard', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = { render: jest.fn() };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render onboard.ejs', async () => {
        await onboardController.getOnboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('onboard.ejs');
    });

    it('should call next with error if render throws', async () => {
        res.render.mockImplementation(() => { throw new Error('render failed') });

        await onboardController.getOnboard(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ─────────────────────────────────────────────
// postOnboard
// ─────────────────────────────────────────────
describe('onboardController.postOnboard', () => {
    let req, res, next;

    // Runs the route's validators, then the controller
    const postOnboard = async () => {
        await runValidators(validateOnboard, req);
        await onboardController.postOnboard(req, res, next);
    };

    beforeEach(() => {
        req = {
            body: { name: 'Jordan Rivera' },
            user: { _id: 'user123', name: '' },
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

    it('should update user name, flash success, and redirect to /dashboard on valid input', async () => {
        await postOnboard();

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { name: 'Jordan Rivera' });
        expect(req.flash).toHaveBeenCalledWith('success', 'Welcome to pretriq, Jordan Rivera.');
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should update req.user.name in memory after a successful DB update', async () => {
        await postOnboard();

        expect(req.user.name).toBe('Jordan Rivera');
    });

    it('should trim leading and trailing whitespace from name before saving', async () => {
        req.body.name = '  Jordan Rivera  ';

        await postOnboard();

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { name: 'Jordan Rivera' });
        expect(req.user.name).toBe('Jordan Rivera');
    });

    it('should flash errors and redirect to /onboard when name is an empty string', async () => {
        req.body.name = '';

        await postOnboard();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name to continue.' }]);
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/onboard');
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should flash errors and redirect to /onboard when name is only whitespace', async () => {
        req.body.name = '   ';

        await postOnboard();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name to continue.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/onboard');
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should flash errors and redirect to /onboard when name is missing from request body', async () => {
        req.body = {};

        await postOnboard();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name to continue.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/onboard');
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should flash errors instead of failing when name is not text', async () => {
        req.body.name = { first: 'Jordan' };

        await postOnboard();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Please enter your name to continue.' }]);
        expect(res.redirect).toHaveBeenCalledWith('/onboard');
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should flash errors and redirect to /onboard when name exceeds 60 characters', async () => {
        req.body.name = 'A'.repeat(61);

        await postOnboard();

        expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Name must be between 1 and 60 characters.' }]);
        expect(req.session.save).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/onboard');
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should accept a name that is exactly 60 characters', async () => {
        req.body.name = 'A'.repeat(60);

        await postOnboard();

        expect(User.findByIdAndUpdate).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should call next with error if User.findByIdAndUpdate throws', async () => {
        const error = new Error('db error');
        User.findByIdAndUpdate.mockRejectedValue(error);

        await postOnboard();

        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should call next with error if session.save fails after a successful DB update', async () => {
        const error = new Error('session error');
        req.session.save = jest.fn(cb => cb(error));

        await postOnboard();

        expect(User.findByIdAndUpdate).toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(error);
        expect(res.redirect).not.toHaveBeenCalled();
    });
});
