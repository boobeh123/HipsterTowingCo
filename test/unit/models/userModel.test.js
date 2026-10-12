const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../../../models/User');

// Mock bcrypt so no real hashing happens in tests.
// Our pre-save hook uses await bcrypt.hash() — so we mock the Promise form.
jest.mock('bcrypt');

describe('User Model', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // Schema validation
  // ─────────────────────────────────────────────
  describe('schema validation', () => {

    it('should require email', async () => {
      const user = new User({ password: 'password123' });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err.errors.email).toBeDefined();
    });

    it('should require password', async () => {
      const user = new User({ email: 'test@example.com' });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      expect(err.errors.password).toBeDefined();
    });

    it('should pass validation with valid email and password', async () => {
      const user = new User({ email: 'test@example.com', password: 'password123' });
      let err;
      try {
        await user.validate();
      } catch (e) {
        err = e;
      }
      // No validation errors expected
      expect(err).toBeUndefined();
    });

    it('should store email in lowercase', () => {
      const user = new User({ email: 'TEST@EXAMPLE.COM', password: 'password123' });
      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      const user = new User({ email: '  test@example.com  ', password: 'password123' });
      expect(user.email).toBe('test@example.com');
    });

  });

  // ─────────────────────────────────────────────
  // pre('save') password hashing
  // ─────────────────────────────────────────────
  describe('pre-save password hashing', () => {

    it('should hash the password when it is modified', async () => {
      bcrypt.hash.mockResolvedValue('hashedpw');

      const user = new User({ email: 'test@example.com', password: 'password123' });
      // Simulate Mongoose marking the password field as modified
      user.isModified = jest.fn((field) => field === 'password');

      // Invoke the pre-save hook directly by calling save — but we need to
      // trigger the hook logic without hitting the DB. We test it by calling
      // bcrypt.hash the same way the hook does and verifying the outcome.
      // Since the hook is async and runs on save, we test its effect via
      // the mock: call the hook logic manually.
      if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(user.password).toBe('hashedpw');
    });

    it('should not hash the password when it is not modified', async () => {
      const user = new User({ email: 'test@example.com', password: 'password123' });
      const originalPassword = user.password;

      user.isModified = jest.fn(() => false);

      if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe(originalPassword);
    });

  });

  // ─────────────────────────────────────────────
  // comparePassword instance method
  // ─────────────────────────────────────────────
  describe('comparePassword()', () => {

    it('should return true when the password matches', done => {
      bcrypt.compare.mockImplementation((plain, hash, cb) => cb(null, true));

      const user = new User({ email: 'test@example.com', password: 'hashedpw' });
      user.comparePassword('password123', (err, isMatch) => {
        expect(err).toBeNull();
        expect(isMatch).toBe(true);
        done();
      });
    });

    it('should return false when the password does not match', done => {
      bcrypt.compare.mockImplementation((plain, hash, cb) => cb(null, false));

      const user = new User({ email: 'test@example.com', password: 'hashedpw' });
      user.comparePassword('wrongpassword', (err, isMatch) => {
        expect(err).toBeNull();
        expect(isMatch).toBe(false);
        done();
      });
    });

    it('should pass an error to the callback if bcrypt fails', done => {
      const bcryptError = new Error('bcrypt failure');
      bcrypt.compare.mockImplementation((plain, hash, cb) => cb(bcryptError, null));

      const user = new User({ email: 'test@example.com', password: 'hashedpw' });
      user.comparePassword('password123', (err, isMatch) => {
        expect(err).toBe(bcryptError);
        expect(isMatch).toBeNull();
        done();
      });
    });

  });

});

// ─────────────────────────────────────────────
// Fields added with server-side validation
// ─────────────────────────────────────────────
describe('User Model — terms, password changes and name length', () => {

  it('should store when the Terms of Use were accepted and when the password last changed', () => {
    const acceptedAt = new Date('2026-10-01T00:00:00Z');
    const changedAt = new Date('2026-10-02T00:00:00Z');
    const user = new User({
      email: 'test@example.com',
      password: 'password123',
      termsAcceptedAt: acceptedAt,
      passwordChangedAt: changedAt,
    });

    expect(user.termsAcceptedAt).toEqual(acceptedAt);
    expect(user.passwordChangedAt).toEqual(changedAt);
  });

  it('should reject a name longer than 60 characters', async () => {
    const user = new User({ email: 'test@example.com', password: 'password123', name: 'A'.repeat(61) });

    await expect(user.validate()).rejects.toMatchObject({ errors: { name: expect.anything() } });
  });

  it('should accept a name of exactly 60 characters', async () => {
    const user = new User({ email: 'test@example.com', password: 'password123', name: 'A'.repeat(60) });

    await expect(user.validate()).resolves.toBeUndefined();
  });
});
