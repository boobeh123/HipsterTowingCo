const learnController = require('../../../controllers/learn');

describe('learnController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { render: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['getLearn', 'learn/index.ejs'],
    ['getDvirGuide', 'learn/dvir.ejs'],
  ])('%s should render %s', async (handler, view) => {
    await learnController[handler](req, res, next);

    expect(res.render).toHaveBeenCalledWith(view);
  });

  it.each(['getLearn', 'getDvirGuide'])('%s should call next with error if render throws', async (handler) => {
    res.render.mockImplementation(() => { throw new Error('render failed') });

    await learnController[handler](req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.render).toHaveBeenCalledTimes(1);
  });
});
