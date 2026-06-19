const privacyController = require('../../../controllers/privacy');

describe('privacyController.getPrivacy', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { render: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render privacy.ejs', async () => {
    await privacyController.getPrivacy(req, res, next);

    expect(res.render).toHaveBeenCalledWith('privacy.ejs');
  });

  it('should call next with error if render throws', async () => {
    res.render.mockImplementation(() => { throw new Error('render failed') });

    await privacyController.getPrivacy(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.render).toHaveBeenCalledTimes(1);
  });
});
