const termsController = require('../../../controllers/terms');

describe('termsController.getTerms', () => {
  it('should render terms', () => {
    const req = {};
    const res = { render: jest.fn() };
    termsController.getTerms(req, res);
    expect(res.render).toHaveBeenCalledWith('terms');
  });
}); 