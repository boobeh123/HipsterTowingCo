const flash = require('../../../middleware/flash');

// The session-backed messages that replaced connect-flash. A plain object
// stands in for req.session here; viewLocals.test.js runs the middleware with
// the real express-session, the way server.js wires it.
describe('flash middleware', () => {

  let req, next;

  beforeEach(() => {
    req = { session: {} };
    next = jest.fn();
    flash(req, {}, next);
  });

  it('should add req.flash and call next', () => {
    expect(typeof req.flash).toBe('function');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should queue a message and return how many of that type are queued', () => {
    expect(req.flash('success', 'Welcome back.')).toBe(1);
    expect(req.flash('success', 'Profile photo updated.')).toBe(2);
    expect(req.session.flash).toEqual({ success: ['Welcome back.', 'Profile photo updated.'] });
  });

  // Validation errors arrive as [{ msg }, ...] from formErrors()
  it('should queue each item of an array', () => {
    expect(req.flash('errors', [{ msg: 'Email is required.' }, { msg: 'Password is required.' }])).toBe(2);
    expect(req.flash('errors')).toEqual([{ msg: 'Email is required.' }, { msg: 'Password is required.' }]);
  });

  it('should return one type oldest first, clear it, and leave the other types queued', () => {
    req.flash('info', 'First');
    req.flash('info', 'Second');
    req.flash('errors', [{ msg: 'Still here.' }]);

    expect(req.flash('info')).toEqual(['First', 'Second']);
    expect(req.flash('info')).toEqual([]);
    expect(req.session.flash).toEqual({ errors: [{ msg: 'Still here.' }] });
  });

  // An unchanged session isn't saved, so an anonymous visitor gets no cookie
  it('should not touch the session when reading with nothing queued', () => {
    expect(req.flash('success')).toEqual([]);
    expect(req.flash('errors')).toEqual([]);
    expect(req.session).toEqual({});
  });

  it('should read as empty when the request has no session at all', () => {
    delete req.session;
    expect(req.flash('info')).toEqual([]);
  });

  // passport's req.login() and req.logout() regenerate the session, as when
  // endStaleSessions signs a session out and then flashes why
  it('should write to the session the request has at the time of the call', () => {
    const oldSession = req.session;
    req.session = {};

    req.flash('info', 'Your password was changed, so you were signed out. Please log in again.');

    expect(req.session.flash.info).toHaveLength(1);
    expect(oldSession).toEqual({});
  });

  it('should throw rather than lose a message when there is no session', () => {
    delete req.session;
    expect(() => req.flash('info', 'Saved.')).toThrow('req.flash() needs a session to keep messages in');
  });

  it('should throw when called without a type', () => {
    expect(() => req.flash()).toThrow(TypeError);
    expect(() => req.flash('', 'Saved.')).toThrow(TypeError);
  });

});
