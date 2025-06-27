const homeController = require('../controllers/home');

describe('homeController.getIndex', () => {
  let req, res;
  beforeEach(() => {
    req = { isAuthenticated: jest.fn() };
    res = { render: jest.fn(), redirect: jest.fn() };
  });

  it('should redirect to /todos if authenticated', () => {
    req.isAuthenticated.mockReturnValue(true);
    homeController.getIndex(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });

  it('should render index.ejs if not authenticated', () => {
    req.isAuthenticated.mockReturnValue(false);
    homeController.getIndex(req, res);
    expect(res.render).toHaveBeenCalledWith('index.ejs');
  });
}); 