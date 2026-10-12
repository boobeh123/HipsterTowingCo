const mongoose = require('mongoose');
const Inspection = require('../../../models/Inspection');

describe('Inspection Model', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should require truckTractorNo and userId', async () => {
    const inspection = new Inspection({});
    let err;
    try {
      await inspection.validate();
    } catch(e) {
      err = e;
    }
    expect(err.errors.truckTractorNo).toBeDefined();
    expect(err.errors.userId).toBeDefined();
  });


  it('should require truckTractorNo to be at least 1 character', async () => {
    const inspection = new Inspection({
        truckTractorNo: '',
        userId: new mongoose.Types.ObjectId()
    });
    let err;
    try {
      await inspection.validate();
    } catch(e) {
      err = e;
    }
    expect(err.errors.truckTractorNo).toBeDefined();
  });

  it('should pass validation with valid truckTractorNo and userId', async () => {
    const inspection = new Inspection({
      truckTractorNo: '12345',
      userId: new mongoose.Types.ObjectId()
    });
    let err;
    try {
      await inspection.validate();
    } catch(e) {
      err = e;
    }
    expect(err).toBeUndefined();
  });

  it('should default conditionSatisfactory, defectsCorrected, defectsNotCorrected to false', () => {
    const inspection = new Inspection({
      truckTractorNo: '123',
      userId: new mongoose.Types.ObjectId()
    });
    expect(inspection.conditionSatisfactory).toBe(false);
    expect(inspection.defectsCorrected).toBe(false);
    expect(inspection.defectsNotCorrected).toBe(false);
  });

  it('should default nested defect fields to false', () => {
    const inspection = new Inspection({
      truckTractorNo: '123',
      userId: new mongoose.Types.ObjectId()
    });
    expect(inspection.defects.truckTractor.brakes).toBe(false);
    expect(inspection.defects.truckTractor.steering).toBe(false);
    expect(inspection.defects.trailer.brakes).toBe(false);
    expect(inspection.defects.trailer.tires).toBe(false);
  });

  it('should store checked defects as true', () => {
    const inspection = new Inspection({
      truckTractorNo: '123',
      userId: new mongoose.Types.ObjectId(),
      defects: {
        truckTractor: { brakes: true, steering: true },
        trailer: { tires: true }
      }
    });
    expect(inspection.defects.truckTractor.brakes).toBe(true);
    expect(inspection.defects.truckTractor.steering).toBe(true);
    expect(inspection.defects.trailer.tires).toBe(true);
  });

  it('should trim whitespace from truckTractorNo', () => {
    const inspection = new Inspection({
      truckTractorNo: '  12345  ',
      userId: new mongoose.Types.ObjectId()
    });
    expect(inspection.truckTractorNo).toBe('12345');
  });
});

// ─────────────────────────────────────────────
// Length limits, the second line of defense behind validateInspection
// ─────────────────────────────────────────────
describe('Inspection Model — length limits and unknown fields', () => {
  const base = () => ({ truckTractorNo: '12345', userId: new mongoose.Types.ObjectId() });

  it.each([
    ['truckTractorNo', 30],
    ['trailerNo', 60],
    ['date', 20],
    ['remarks', 2000],
    ['mechanicDate', 20],
    ['driverDate', 20],
  ])('should reject %s longer than %i characters', async (field, max) => {
    const inspection = new Inspection({ ...base(), [field]: 'x'.repeat(max + 1) });

    await expect(inspection.validate()).rejects.toMatchObject({ errors: { [field]: expect.anything() } });
  });

  it('should accept every field at its limit', async () => {
    const inspection = new Inspection({
      userId: new mongoose.Types.ObjectId(),
      truckTractorNo: 'x'.repeat(30),
      trailerNo: 'x'.repeat(60),
      date: 'x'.repeat(20),
      remarks: 'x'.repeat(2000),
      mechanicDate: 'x'.repeat(20),
      driverDate: 'x'.repeat(20),
    });

    await expect(inspection.validate()).resolves.toBeUndefined();
  });

  // validateInspection lets any defect name through as long as its value is
  // true or false, relying on the schema to drop names it doesn't know
  it('should drop defect names the schema does not define', () => {
    const inspection = new Inspection({
      ...base(),
      defects: { truckTractor: { brakes: true, $where: true, madeUp: true }, trailer: { tires: true } },
    });

    const truckTractor = inspection.toObject().defects.truckTractor;
    expect(truckTractor.brakes).toBe(true);
    expect(truckTractor).not.toHaveProperty('madeUp');
    expect(truckTractor).not.toHaveProperty('$where');
    expect(inspection.toObject().defects.trailer.tires).toBe(true);
  });
});
