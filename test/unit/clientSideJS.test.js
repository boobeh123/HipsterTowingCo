/**
 * @jest-environment jsdom
 */

const { sanitizeText, validateAndSanitize, decodeHTMLEntities } = require('../../public/js/utils.js');



// ─────────────────────────────────────────────
// sanitizeText
// ─────────────────────────────────────────────
describe('sanitizeText()', () => {

  it('should remove < and > characters', () => {
    expect(sanitizeText('<script>')).toBe('script');
  });

  it('should remove double quotes', () => {
    expect(sanitizeText('say "hello"')).toBe('say hello');
  });

  it('should remove backticks', () => {
    expect(sanitizeText('hello `world`')).toBe('hello world');
  });

  it('should remove single quotes', () => {
    expect(sanitizeText("it's a test")).toBe('its a test');
  });

  it('should remove backslashes', () => {
    expect(sanitizeText('C:\\Program Files\\')).toBe('C:Program Files');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world');
  });

  it('should return an empty string when given a non-string', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText({})).toBe('');
  });

  it('should return an empty string when given an empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should leave safe characters untouched', () => {
    expect(sanitizeText('Truck #1234 / Unit 5')).toBe('Truck #1234 / Unit 5');
  });

  it('should match the documented examples', () => {
    expect(sanitizeText('<img src="#" onerror=alert(1)')).toBe('img src=# onerror=alert(1)');
    expect(sanitizeText("'; DROP TABLE users; --")).toBe('; DROP TABLE users; --');
    expect(sanitizeText('     hello `world`     ')).toBe('hello world');
    expect(sanitizeText('C:\\Program Files\\')).toBe('C:Program Files');
  });

});

// ─────────────────────────────────────────────
// validateAndSanitize
// ─────────────────────────────────────────────
describe('validateAndSanitize()', () => {

  const validInput = {
    truckTractorNo: '1234567',
    trailerNo: '89012',
    remarks: 'All clear',
    mechanicDate: '',
    driverDate: '',
    defects: {
      truckTractor: { steering: true },
      trailer: { brakes: false },
    },
  };

  it('should return a sanitized object on valid input', () => {
    const result = validateAndSanitize(validInput);

    expect(result).not.toBeNull();
    expect(result.truckTractorNo).toBe('1234567');
    expect(result.trailerNo).toBe('89012');
    expect(result.remarks).toBe('All clear');
  });

  it('should return null when truckTractorNo is empty', () => {
    const result = validateAndSanitize({ ...validInput, truckTractorNo: '' });
    expect(result).toBeNull();
  });

  it('should return null when truckTractorNo is only XSS characters', () => {
    const result = validateAndSanitize({ ...validInput, truckTractorNo: '<>"' });
    expect(result).toBeNull();
  });

  it('should sanitize XSS characters from truckTractorNo', () => {
    const result = validateAndSanitize({ ...validInput, truckTractorNo: "<12\\345'67>" });
    expect(result.truckTractorNo).toBe('1234567');
  });

  it('should sanitize XSS characters from trailerNo', () => {
    const result = validateAndSanitize({ ...validInput, trailerNo: '<89\\012>' });
    expect(result.trailerNo).toBe('89012');
  });

  it('should sanitize XSS characters from remarks', () => {
    const result = validateAndSanitize({ ...validInput, remarks: '<b>bold</b>' });
    expect(result.remarks).toBe('bbold/b');
  });

  it('should preserve the defects object unchanged', () => {
    const result = validateAndSanitize(validInput);
    expect(result.defects).toEqual(validInput.defects);
  });

  it('should handle empty optional fields without error', () => {
    const result = validateAndSanitize({
      ...validInput,
      trailerNo: '',
      remarks: '',
      mechanicDate: '',
      driverDate: '',
    });
    expect(result).not.toBeNull();
    expect(result.trailerNo).toBe('');
    expect(result.remarks).toBe('');
  });

  it('should match the documented example', () => {
    const input = {
      date: '3/1/2026',
      truckTractorNo: "<12\\345'67>",
      defects: { truckTractor: { airCompressor: true, springs: true, mirrors: true } },
      trailerNo: 'C:\\Program Files\\',
      remarks: '',
      mechanicDate: '',
      driverDate: '',
    };
    const result = validateAndSanitize(input);
    expect(result.truckTractorNo).toBe('1234567');
    expect(result.trailerNo).toBe('C:Program Files');
    expect(result.defects.truckTractor.airCompressor).toBe(true);
  });

});

// ─────────────────────────────────────────────
// decodeHTMLEntities
// ─────────────────────────────────────────────
describe('decodeHTMLEntities()', () => {

  it('should decode &lt; and &gt;', () => {
    expect(decodeHTMLEntities('&lt;script&gt;')).toBe('<script>');
  });

  it('should decode &amp;', () => {
    expect(decodeHTMLEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  it('should decode &quot;', () => {
    expect(decodeHTMLEntities('say &quot;hello&quot;')).toBe('say "hello"');
  });

  it('should return a plain string unchanged', () => {
    expect(decodeHTMLEntities('no entities here')).toBe('no entities here');
  });

  it('should decode a full XSS entity string', () => {
    expect(
      decodeHTMLEntities('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;')
    ).toBe('<script>alert("test")</script>');
  });

});
