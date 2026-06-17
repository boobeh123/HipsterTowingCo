const privacyController = require('../../../controllers/privacy');

describe('privacyController.getPrivacy', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render privacy', async () => {
    await privacyController.getPrivacy(req, res);

    expect(res.render).toHaveBeenCalledWith('privacy.ejs');
  });

  it('should render 500 if res.render throws', async () => {
    res.render
      .mockImplementationOnce(() => { throw new Error('render failed') })
      .mockImplementationOnce(() => {});

    await privacyController.getPrivacy(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('500.ejs');
  });
});
