const { signOffStatus } = require('../../../utils/signOff');

describe('signOffStatus', () => {

  const withDefect = (fields = {}) => ({ defects: { truckTractor: { brakes: true }, trailer: {} }, ...fields });

  it('should have nothing to sign off on a report without defects', () => {
    expect(signOffStatus({ defects: { truckTractor: { brakes: false }, trailer: {} } })).toBe('none');
    expect(signOffStatus({})).toBe('none');
    expect(signOffStatus({ defects: { truckTractor: {}, trailer: {} }, defectsCorrected: true })).toBe('none');
  });

  it('should wait for the mechanic once a report lists a defect, on the truck or the trailer', () => {
    expect(signOffStatus(withDefect())).toBe('open');
    expect(signOffStatus({ defects: { truckTractor: {}, trailer: { tires: true } } })).toBe('open');
  });

  // Including a certification ticked on the form when the report was saved
  it('should count either of the form\'s repair boxes as certified', () => {
    expect(signOffStatus(withDefect({ defectsCorrected: true }))).toBe('certified');
    expect(signOffStatus(withDefect({ defectsNotCorrected: true }))).toBe('certified');
  });

  it('should be final once the next driver has signed', () => {
    expect(signOffStatus(withDefect({ defectsCorrected: true, acknowledgedAt: new Date() }))).toBe('acknowledged');
  });

});
