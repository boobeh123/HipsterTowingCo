const { redactUrl } = require('../../../utils/logUrl');

describe('redactUrl()', () => {
  it('should hide a password reset token', () => {
    expect(redactUrl('/reset/0123456789abcdef0123456789abcdef01234567')).toBe('/reset/:token');
    expect(redactUrl('/reset/abc?x=1')).toBe('/reset/:token');
  });

  // Search text can quote a driver's remarks
  it('should hide dashboard search text and keep the other filters', () => {
    expect(redactUrl('/dashboard?q=left+mirror&from=2026-10-01&tz=600')).toBe('/dashboard?q=***&from=2026-10-01&tz=600');
    expect(redactUrl('/dashboard/export?status=ok&q=brakes')).toBe('/dashboard/export?status=ok&q=***');
  });

  it('should leave other URLs exactly as they were', () => {
    expect(redactUrl('/dashboard')).toBe('/dashboard');
    expect(redactUrl('/dashboard?page=2&status=defects')).toBe('/dashboard?page=2&status=defects');
    expect(redactUrl('/css/style.css')).toBe('/css/style.css');
    expect(redactUrl('/reset')).toBe('/reset');
  });
});
