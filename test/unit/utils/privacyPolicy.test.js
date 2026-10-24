const { UPDATED, ANNOUNCE, updatedAt, updatedLabel, needsPrivacyNotice, safeReturnPath } = require('../../../utils/privacyPolicy');

describe('privacyPolicy', () => {

  it('should date the policy from midnight in Hawaii on the day it took effect', () => {
    expect(UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(updatedAt.toISOString()).toBe(`${UPDATED}T10:00:00.000Z`);
    expect(typeof ANNOUNCE).toBe('boolean');
  });

  it('should spell the date out the way the page shows it', () => {
    const [year, month, day] = UPDATED.split('-').map(Number);
    const monthName = new Date(Date.UTC(year, month - 1, 15)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

    expect(updatedLabel).toBe(`${monthName} ${day}, ${year}`);
  });

  describe('needsPrivacyNotice', () => {

    const policy = { announce: true, updatedAt: new Date('2026-11-01T10:00:00Z') };
    const before = new Date('2026-10-01T00:00:00Z');
    const after = new Date('2026-11-02T00:00:00Z');
    const name = 'Jordan Rivera';

    it('should tell an account created before the update that hasn\'t seen it', () => {
      expect(needsPrivacyNotice({ name, createdAt: before }, policy)).toBe(true);
      expect(needsPrivacyNotice({ name, createdAt: before, privacyNoticeSeenAt: before }, policy)).toBe(true);
    });

    // Accounts made before the schema had timestamps have no createdAt
    it('should tell an account with no createdAt', () => {
      expect(needsPrivacyNotice({ name }, policy)).toBe(true);
    });

    it('should stop once the account has seen this update', () => {
      expect(needsPrivacyNotice({ name, createdAt: before, privacyNoticeSeenAt: after }, policy)).toBe(false);
      expect(needsPrivacyNotice({ name, createdAt: before, privacyNoticeSeenAt: policy.updatedAt }, policy)).toBe(false);
    });

    it('should leave out accounts created after the update, and guests', () => {
      expect(needsPrivacyNotice({ name, createdAt: after }, policy)).toBe(false);
      expect(needsPrivacyNotice(null, policy)).toBe(false);
      expect(needsPrivacyNotice(undefined, policy)).toBe(false);
    });

    // ensureAuth sends a nameless account back to /onboard, "Got it" included
    it('should wait until an account has finished onboarding', () => {
      expect(needsPrivacyNotice({ createdAt: before }, policy)).toBe(false);
      expect(needsPrivacyNotice({ name: '', createdAt: before }, policy)).toBe(false);
    });

    it('should tell nobody when the update isn\'t announced', () => {
      expect(needsPrivacyNotice({ name, createdAt: before }, { ...policy, announce: false })).toBe(false);
    });

    it('should follow the published policy when no policy is passed', () => {
      expect(needsPrivacyNotice({ name, createdAt: new Date(0) })).toBe(ANNOUNCE);
    });

  });

  describe('safeReturnPath', () => {

    it.each(['/', '/dashboard', '/learn/dvir', '/dashboard?page=2'])('should keep the local path %s', (path) => {
      expect(safeReturnPath(path)).toBe(path);
    });

    // Browsers read //host and /\host as another site
    it.each([
      ['another site', 'https://evil.example'],
      ['a protocol-relative URL', '//evil.example'],
      ['a backslash trick', '/\\evil.example'],
      ['a path with a line break', '/dashboard\r\nSet-Cookie: x=1'],
      ['a relative path', 'dashboard'],
      ['an empty string', ''],
      ['nothing', undefined],
      ['a list', ['/dashboard']],
      ['a very long path', `/${'a'.repeat(200)}`],
    ])('should send %s to the dashboard', (label, value) => {
      expect(safeReturnPath(value)).toBe('/dashboard');
    });

  });

});
