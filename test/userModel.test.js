const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

jest.mock('bcrypt');

describe('User Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should require email and password', async () => {
    const user = new User({});
    let err;
    try {
      await user.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('should require a valid email', async () => {
    const user = new User({ email: 'bademail', password: 'password123' });
    let err;
    try {
      await user.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.email).toBeDefined();
  });

  it('should require password of at least 8 chars', async () => {
    const user = new User({ email: 'test@example.com', password: 'short' });
    let err;
    try {
      await user.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.password).toBeDefined();
  });

  it('should hash password on save', async () => {
    bcrypt.genSalt.mockImplementation((rounds, cb) => cb(null, 'salt'));
    bcrypt.hash.mockImplementation((pw, salt, cb) => cb(null, 'hashedpw'));
    const user = new User({ email: 'test@example.com', password: 'password123' });
    user.isModified = jest.fn(() => true);
    // Find the pre-save hook function
    const pres = User.schema.s.hooks._pres;
    const preSave = pres.find(h => h.kind === 'pre' && h.name === 'save').fn;
    await new Promise((resolve, reject) => {
      preSave.call(user, err => {
        if (err) reject(err);
        else resolve();
      });
    });
    expect(user.password).toBe('hashedpw');
  });

  it('should not hash password if not modified', async () => {
    const user = new User({ email: 'test@example.com', password: 'password123' });
    user.isModified = jest.fn(() => false);
    // Find the pre-save hook function
    const pres = User.schema.s.hooks._pres;
    const preSave = pres.find(h => h.kind === 'pre' && h.name === 'save').fn;
    const next = jest.fn();
    preSave.call(user, next);
    expect(next).toHaveBeenCalled();
    expect(bcrypt.genSalt).not.toHaveBeenCalled();
  });

  it('should compare password correctly', done => {
    const user = new User({ password: 'hashedpw' });
    bcrypt.compare.mockImplementation((plain, hash, cb) => cb(null, plain === 'password123'));
    user.comparePassword('password123', (err, isMatch) => {
      expect(isMatch).toBe(true);
      user.comparePassword('wrong', (err, isMatch) => {
        expect(isMatch).toBe(false);
        done();
      });
    });
  });

  it('should return correct profileUrl virtual', () => {
    const user = new User({ _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') });
    expect(user.profileUrl).toBe('/profile/507f1f77bcf86cd799439011');
  });

  it('should return true for isAdminUser if role is Admin or isAdmin true', () => {
    const user1 = new User({ role: 'Admin', isAdmin: false });
    const user2 = new User({ role: 'user', isAdmin: true });
    const user3 = new User({ role: 'user', isAdmin: false });
    expect(user1.isAdminUser()).toBe(true);
    expect(user2.isAdminUser()).toBe(true);
    expect(user3.isAdminUser()).toBe(false);
  });
}); 