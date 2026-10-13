// public/js/utils.js has no DOM access, so these run in Jest's plain node environment
const { FIELD_LIMITS, SIGNATURE_MAX_LENGTH, REPAIR_FIELDS, sanitizeText, validateAndSanitize, decodeHTMLEntities, pdfFileName, isSignatureImage, hasDefects, withoutRepairFields } = require('../../public/js/utils.js');

// ─────────────────────────────────────────────
// sanitizeText
// ─────────────────────────────────────────────
describe('sanitizeText()', () => {

  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world');
  });

  // These used to be stripped, which turned "Driver's side" into "Drivers side".
  // jsPDF draws plain text and the dashboard escapes output, so they're harmless.
  it('should keep quotes, apostrophes, angle brackets, backticks and backslashes as typed', () => {
    expect(sanitizeText("Driver's side mirror")).toBe("Driver's side mirror");
    expect(sanitizeText('5\'6" clearance, pressure <30 psi, `noted`, C:\\path')).toBe('5\'6" clearance, pressure <30 psi, `noted`, C:\\path');
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

});

// ─────────────────────────────────────────────
// validateAndSanitize
// ─────────────────────────────────────────────
describe('validateAndSanitize()', () => {

  const validInput = {
    date: '3/1/2026',
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

  it('should return a cleaned object on valid input', () => {
    const result = validateAndSanitize(validInput);

    expect(result).not.toBeNull();
    expect(result.truckTractorNo).toBe('1234567');
    expect(result.trailerNo).toBe('89012');
    expect(result.remarks).toBe('All clear');
  });

  it('should return null when truckTractorNo is empty', () => {
    expect(validateAndSanitize({ ...validInput, truckTractorNo: '' })).toBeNull();
  });

  it('should return null when truckTractorNo is only whitespace', () => {
    expect(validateAndSanitize({ ...validInput, truckTractorNo: '   ' })).toBeNull();
  });

  it('should trim every text field', () => {
    const result = validateAndSanitize({ ...validInput, truckTractorNo: '  TRK-1  ', trailerNo: ' TRL-2 ', remarks: '  Brakes soft  ' });

    expect(result.truckTractorNo).toBe('TRK-1');
    expect(result.trailerNo).toBe('TRL-2');
    expect(result.remarks).toBe('Brakes soft');
  });

  it('should keep the remarks exactly as typed apart from trimming', () => {
    const remarks = "Driver's side mirror cracked; <b> isn't markup here";
    expect(validateAndSanitize({ ...validInput, remarks }).remarks).toBe(remarks);
  });

  // The modal's maxlength attributes already stop longer input; this is the safety net
  it('should cut each text field to the length the server accepts', () => {
    const result = validateAndSanitize({
      ...validInput,
      truckTractorNo: 'T'.repeat(40),
      trailerNo: 'R'.repeat(70),
      remarks: 'x'.repeat(2500),
      mechanicDate: 'd'.repeat(25),
      driverDate: 'd'.repeat(25),
    });

    Object.entries(FIELD_LIMITS).forEach(([field, maxLength]) => {
      expect(result[field]).toHaveLength(maxLength);
    });
  });

  it('should match the server limits in middleware/validators.js', () => {
    expect(FIELD_LIMITS).toEqual({ truckTractorNo: 30, trailerNo: 60, remarks: 2000, mechanicDate: 20, driverDate: 20 });
  });

  it('should leave the defects and the date untouched and not change its input', () => {
    const input = JSON.parse(JSON.stringify(validInput));
    const result = validateAndSanitize(input);

    expect(result.defects).toEqual(validInput.defects);
    expect(result.date).toBe('3/1/2026');
    expect(input).toEqual(validInput);
  });

  it('should turn missing optional fields into empty strings', () => {
    const result = validateAndSanitize({ truckTractorNo: '1234567' });

    expect(result.trailerNo).toBe('');
    expect(result.remarks).toBe('');
    expect(result.mechanicDate).toBe('');
  });

});

// ─────────────────────────────────────────────
// decodeHTMLEntities — for inspections saved through escape() in 2025
// ─────────────────────────────────────────────
describe('decodeHTMLEntities()', () => {

  it('should decode the entities express-validator escape() produced', () => {
    expect(decodeHTMLEntities('Driver&#x27;s side')).toBe("Driver's side");
    expect(decodeHTMLEntities('TRL-1&#x2F;2')).toBe('TRL-1/2');
    expect(decodeHTMLEntities('&lt;b&gt; &amp; &quot;q&quot; &#96;t&#96; C:&#x5C;')).toBe('<b> & "q" `t` C:\\');
  });

  it('should decode decimal and named entities', () => {
    expect(decodeHTMLEntities('it&#39;s Tom &amp; Jerry')).toBe("it's Tom & Jerry");
  });

  it('should return a plain string unchanged', () => {
    expect(decodeHTMLEntities('no entities here')).toBe('no entities here');
  });

  // The old version parsed the text as HTML, which drops anything tag-shaped
  it('should keep tag-like text as typed', () => {
    expect(decodeHTMLEntities('check <brake lines> and <b>pads</b>')).toBe('check <brake lines> and <b>pads</b>');
  });

  it('should leave unknown or invalid entities alone', () => {
    expect(decodeHTMLEntities('&nbsp; &#0; &#x110000; R&R')).toBe('&nbsp; &#0; &#x110000; R&R');
  });

  it('should return an empty string when given a non-string', () => {
    expect(decodeHTMLEntities(undefined)).toBe('');
  });

});

// ─────────────────────────────────────────────
// pdfFileName
// ─────────────────────────────────────────────
describe('pdfFileName()', () => {

  it('should name the file after the truck number and the local date', () => {
    expect(pdfFileName('TRK-100', new Date(2026, 9, 11, 23, 30))).toBe('pretriq-TRK-100-2026-10-11.pdf');
  });

  it('should turn characters that are unsafe in file names into dashes', () => {
    expect(pdfFileName('Unit 5 / "A"', new Date(2026, 0, 2))).toBe('pretriq-Unit-5-A--2026-01-02.pdf');
  });

  it('should fall back to "inspection" without a truck number and to today without a valid date', () => {
    const today = new Date();
    const expectedDay = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

    expect(pdfFileName('', new Date('not a date'))).toBe(`pretriq-inspection-${expectedDay}.pdf`);
  });

});

// ─────────────────────────────────────────────
// isSignatureImage — what generateDVIRPDF() stamps on a signature line
// ─────────────────────────────────────────────
describe('isSignatureImage()', () => {

  it('should accept a PNG data URL within the size limit', () => {
    expect(isSignatureImage('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });

  // Inspections saved before the pads existed can hold plain text here
  it('should reject old text signatures and anything that is not a PNG data URL', () => {
    expect(isSignatureImage('Jordan Rivera')).toBe(false);
    expect(isSignatureImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSignatureImage('data:image/png;base64,')).toBe(false);
    expect(isSignatureImage(undefined)).toBe(false);
    expect(isSignatureImage({})).toBe(false);
  });

  it('should reject a data URL longer than SIGNATURE_MAX_LENGTH', () => {
    const prefix = 'data:image/png;base64,';
    expect(isSignatureImage(prefix + 'A'.repeat(SIGNATURE_MAX_LENGTH - prefix.length))).toBe(true);
    expect(isSignatureImage(prefix + 'A'.repeat(SIGNATURE_MAX_LENGTH - prefix.length + 1))).toBe(false);
  });

});

// ─────────────────────────────────────────────
// hasDefects — whether the modal shows the repair section
// ─────────────────────────────────────────────
describe('hasDefects()', () => {

  it('should be false when nothing is ticked', () => {
    expect(hasDefects({})).toBe(false);
    expect(hasDefects({ defects: {} })).toBe(false);
    expect(hasDefects(null)).toBe(false);
  });

  // Saved inspections list every item, true or false
  it('should be false when every item is false', () => {
    expect(hasDefects({ defects: { truckTractor: { brakes: false, tires: false }, trailer: { lightsAll: false } } })).toBe(false);
  });

  it('should be true when a truck or a trailer item is ticked', () => {
    expect(hasDefects({ defects: { truckTractor: { brakes: true } } })).toBe(true);
    expect(hasDefects({ defects: { trailer: { landingGear: true } } })).toBe(true);
  });

  it('should count only true, not other truthy values', () => {
    expect(hasDefects({ defects: { truckTractor: { brakes: 'true', tires: 1 } } })).toBe(false);
  });

});

// ─────────────────────────────────────────────
// withoutRepairFields — a report without defects has nothing to repair
// ─────────────────────────────────────────────
describe('withoutRepairFields()', () => {

  const repairs = {
    defectsCorrected: true,
    defectsNotCorrected: true,
    mechanicSignature: 'data:image/png;base64,iVBORw0KGgo=',
    mechanicDate: '10/12/2026',
    driverDate: '10/13/2026',
  };

  it('should keep the repair fields on a report that lists a defect', () => {
    const inspection = { truckTractorNo: 'TRK-1', defects: { truckTractor: { brakes: true } }, ...repairs };
    expect(withoutRepairFields(inspection)).toEqual(inspection);
  });

  it('should drop every repair field from a report without defects', () => {
    const result = withoutRepairFields({ truckTractorNo: 'TRK-1', defects: {}, ...repairs });
    expect(REPAIR_FIELDS).toHaveLength(5);
    REPAIR_FIELDS.forEach((field) => {
      expect(result).not.toHaveProperty(field);
    });
  });

  it("should keep the truck number, remarks, condition and the driver's signature", () => {
    const driverSignature = 'data:image/png;base64,iVBORw0KGgo=';
    const inspection = { truckTractorNo: 'TRK-1', remarks: 'All good', conditionSatisfactory: true, driverSignature, ...repairs };
    expect(withoutRepairFields(inspection)).toEqual({ truckTractorNo: 'TRK-1', remarks: 'All good', conditionSatisfactory: true, driverSignature });
  });

  it('should not change the object it was given', () => {
    const inspection = { truckTractorNo: 'TRK-1', ...repairs };
    withoutRepairFields(inspection);
    expect(inspection).toEqual({ truckTractorNo: 'TRK-1', ...repairs });
  });

});
