const privacyController = require('../controllers/privacy');

describe('privacyController.getPrivacy', () => {
  it('should render privacy', () => {
    const req = {};
    const res = { render: jest.fn() };
    privacyController.getPrivacy(req, res);
    expect(res.render).toHaveBeenCalledWith('privacy');
  });
}); 