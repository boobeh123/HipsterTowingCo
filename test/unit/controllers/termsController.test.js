const termController = require('../../../controllers/terms');

describe('termController.getTerms', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { render: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render terms.ejs', async () => {
    await termController.getTerms(req, res, next);

    expect(res.render).toHaveBeenCalledWith('terms.ejs');
  });

  it('should call next with error if render throws', async () => {
    res.render.mockImplementation(() => { throw new Error('render failed') });

    await termController.getTerms(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.render).toHaveBeenCalledTimes(1);
  });
});
