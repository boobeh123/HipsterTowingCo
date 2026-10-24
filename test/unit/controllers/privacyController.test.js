const privacyController = require('../../../controllers/privacy');
const User = require('../../../models/User');
const runValidators = require('../helpers/runValidators');
const { validatePrivacyNotice } = require('../../../middleware/validators');

jest.mock('../../../models/User');

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

describe('privacyController.postNoticeSeen', () => {
  let res, next;

  // The route runs validatePrivacyNotice first, then the controller
  const postNoticeSeen = async (body) => {
    const req = { body, user: { _id: 'user-1' } };
    await runValidators(validatePrivacyNotice, req);
    await privacyController.postNoticeSeen(req, res, next);
  };

  beforeEach(() => {
    res = { redirect: jest.fn() };
    next = jest.fn();
    User.updateOne.mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save when this account saw the notice, then go back to the page', async () => {
    await postNoticeSeen({ returnTo: '/learn/dvir' });

    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user-1' }, { $set: { privacyNoticeSeenAt: expect.any(Date) } });
    expect(res.redirect).toHaveBeenCalledWith('/learn/dvir');
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['another site', { returnTo: 'https://evil.example' }],
    ['a protocol-relative URL', { returnTo: '//evil.example' }],
    ['a list', { returnTo: ['/learn', '/dashboard'] }],
    ['no returnTo', {}],
  ])('should go to the dashboard for %s', async (label, body) => {
    await postNoticeSeen(body);

    expect(User.updateOne).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should call next with the error if the save fails', async () => {
    User.updateOne.mockRejectedValue(new Error('db down'));

    await postNoticeSeen({ returnTo: '/dashboard' });

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
