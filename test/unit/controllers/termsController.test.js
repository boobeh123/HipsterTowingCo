const termController = require('../../../controllers/terms');

describe('termController.getTerms', () => {
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

  it('should render terms.ejs', async () => {
    await termController.getTerms(req, res);

    expect(res.render).toHaveBeenCalledWith('terms.ejs');
  });

  it('should render 500.ejs if res.render throws', async () => {
    res.render
      .mockImplementationOnce(() => { throw new Error('render failed') })
      .mockImplementationOnce(() => {});

    await termController.getTerms(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('500.ejs');
  });
});
