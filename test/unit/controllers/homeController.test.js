const homeController = require('../../../controllers/home');

describe('homeController.getIndex', () => {
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

  it('should render index.ejs', async () => {
    await homeController.getIndex(req, res);

    expect(res.render).toHaveBeenCalledWith('index.ejs');
  });

  it('should render 500.ejs if res.render throws', async () => {
    // First call throws, second call (500.ejs) should succeed
    res.render
      .mockImplementationOnce(() => { throw new Error('render failed') })
      .mockImplementationOnce(() => {});

    await homeController.getIndex(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('500.ejs');
  });
});
