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
