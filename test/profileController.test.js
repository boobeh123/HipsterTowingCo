const profileController = require('../controllers/profile');
const User = require('../models/User');

jest.mock('../middleware/cloudinary', () => ({}));
jest.mock('../models/User');

describe('profileController.getProfile', () => {
  let req, res;
  beforeEach(() => {
    req = { user: { _id: 'user123', email: 'test@example.com' } };
    res = { render: jest.fn() };
    User.find.mockReset();
    User.findById.mockReset();
  });

  it('should render profile.ejs with user and users on success', async () => {
    const fakeUser = { _id: 'user123', email: 'test@example.com' };
    const fakeUsers = [fakeUser];
    User.find.mockResolvedValue(fakeUsers);
    User.findById.mockResolvedValue(fakeUser);
    await profileController.getProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('profile.ejs', expect.objectContaining({
      user: req.user,
      users: fakeUsers,
      page: expect.any(String),
    }));
  });

  it('should render 500 error page on DB error', async () => {
    User.find.mockRejectedValue(new Error('DB error'));
    await profileController.getProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
});

describe('profileController.editProfile', () => {
  let req, res;
  beforeEach(() => {
    req = { user: { _id: 'user123', email: 'test@example.com' } };
    res = { render: jest.fn(), redirect: jest.fn() };
    User.findById.mockReset();
  });

  it('should render editProfile if user found and emails match', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', email: 'test@example.com' });
    await profileController.editProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('editProfile', expect.objectContaining({ user: req.user, page: expect.any(String) }));
  });

  it('should redirect if user not found', async () => {
    User.findById.mockResolvedValue(null);
    await profileController.editProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should redirect if emails do not match', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', email: 'other@example.com' });
    await profileController.editProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render 500 on error', async () => {
    User.findById.mockRejectedValue(new Error('DB error'));
    await profileController.editProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
});

describe('profileController.updateProfile', () => {
  let req, res;
  beforeEach(() => {
    req = { user: { _id: 'user123', email: 'test@example.com' }, body: { userName: 'New Name', userEmail: 'new@example.com' } };
    res = { redirect: jest.fn(), render: jest.fn() };
    User.findById.mockReset();
    User.findByIdAndUpdate = jest.fn();
  });

  it('should update and redirect on success', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', email: 'test@example.com' });
    User.findByIdAndUpdate.mockResolvedValue({});
    await profileController.updateProfile(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { name: 'New Name', email: 'new@example.com' });
    expect(res.redirect).toHaveBeenCalledWith('/profile');
  });

  it('should redirect if user not found', async () => {
    User.findById.mockResolvedValue(null);
    await profileController.updateProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should redirect if emails do not match', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', email: 'other@example.com' });
    await profileController.updateProfile(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should render 404 on error', async () => {
    User.findById.mockRejectedValue(new Error('DB error'));
    await profileController.updateProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/404.ejs');
  });
});

describe('profileController.updatePhoto', () => {
  let req, res, cloudinaryMock;
  beforeEach(() => {
    req = {
      user: { id: 'user123', _id: 'user123', email: 'test@example.com', image: '', cloudinaryId: 'cloud123' },
      file: { path: '/fake/path.jpg' },
      headers: {},
    };
    res = { redirect: jest.fn(), json: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() };
    cloudinaryMock = require('../middleware/cloudinary');
    cloudinaryMock.uploader = {
      upload: jest.fn(),
      destroy: jest.fn(),
    };
    User.findByIdAndUpdate = jest.fn();
  });

  it('should upload new photo if user has no image', async () => {
    req.user.image = '';
    cloudinaryMock.uploader.upload.mockResolvedValue({ secure_url: 'http://img.url', public_id: 'cloud123' });
    User.findByIdAndUpdate.mockResolvedValue({});
    await profileController.updatePhoto(req, res);
    expect(cloudinaryMock.uploader.upload).toHaveBeenCalledWith('/fake/path.jpg', expect.any(Object));
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', expect.objectContaining({ image: 'http://img.url', cloudinaryId: 'cloud123' }));
    expect(res.redirect).toHaveBeenCalledWith('/profile');
  });

  it('should replace photo if user has image', async () => {
    req.user.image = 'http://old.img';
    cloudinaryMock.uploader.destroy.mockResolvedValue({});
    cloudinaryMock.uploader.upload.mockResolvedValue({ secure_url: 'http://img.url', public_id: 'cloud123' });
    User.findByIdAndUpdate.mockResolvedValue({});
    await profileController.updatePhoto(req, res);
    expect(cloudinaryMock.uploader.destroy).toHaveBeenCalledWith('cloud123');
    expect(cloudinaryMock.uploader.upload).toHaveBeenCalledWith('/fake/path.jpg', expect.any(Object));
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', expect.objectContaining({ image: 'http://img.url', cloudinaryId: 'cloud123' }));
    expect(res.redirect).toHaveBeenCalledWith('/profile');
  });

  it('should return JSON if AJAX request', async () => {
    req.xhr = true;
    cloudinaryMock.uploader.upload.mockResolvedValue({ secure_url: 'http://img.url', public_id: 'cloud123' });
    User.findByIdAndUpdate.mockResolvedValue({});
    await profileController.updatePhoto(req, res);
    expect(res.json).toHaveBeenCalledWith({ imageUrl: 'http://img.url' });
  });

  it('should return JSON error on upload error if AJAX', async () => {
    req.xhr = true;
    cloudinaryMock.uploader.upload.mockRejectedValue(new Error('Upload error'));
    await profileController.updatePhoto(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error uploading photo.' });
  });

  it('should render 500 on error if not AJAX', async () => {
    cloudinaryMock.uploader.upload.mockRejectedValue(new Error('Upload error'));
    await profileController.updatePhoto(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
});

describe('profileController.deleteProfile', () => {
  let req, res;
  beforeEach(() => {
    req = {
      user: { _id: 'user123' },
      params: { id: 'user123' },
      logout: jest.fn(cb => cb && cb()),
      session: { destroy: jest.fn(cb => cb && cb()) },
    };
    res = { redirect: jest.fn(), render: jest.fn(), status: jest.fn().mockReturnThis() };
    User.findByIdAndDelete = jest.fn();
  });

  it('should delete and logout if user matches', async () => {
    User.findByIdAndDelete.mockResolvedValue({});
    await profileController.deleteProfile(req, res);
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('user123');
    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('should return 403 if user does not match', async () => {
    req.user._id = 'user123';
    req.params.id = 'otherid';
    await profileController.deleteProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('./errors/404.ejs');
  });

  it('should render 500 on error', async () => {
    User.findByIdAndDelete.mockRejectedValue(new Error('DB error'));
    await profileController.deleteProfile(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
}); 