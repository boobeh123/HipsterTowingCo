const Inspection = require('../models/Todo');
const mongoose = require('mongoose');

describe('Inspection Model', () => {
  it('should require truckTractorNo and userId', async () => {
    const inspection = new Inspection({});
    let err;
    try {
      await inspection.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.truckTractorNo).toBeDefined();
    expect(err.errors.userId).toBeDefined();
  });

  it('should require truckTractorNo to be at least 3 chars', async () => {
    const inspection = new Inspection({ truckTractorNo: '12', userId: new mongoose.Types.ObjectId() });
    let err;
    try {
      await inspection.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.truckTractorNo).toBeDefined();
  });

  it('should set default values for booleans', () => {
    const inspection = new Inspection({ truckTractorNo: '123', userId: new mongoose.Types.ObjectId() });
    expect(inspection.conditionSatisfactory).toBe(false);
    expect(inspection.defectsCorrected).toBe(false);
    expect(inspection.defectsNotCorrected).toBe(false);
  });

  it('should set default values for nested defects', () => {
    const inspection = new Inspection({
      truckTractorNo: '123',
      userId: new mongoose.Types.ObjectId(),
      defects: { truckTractor: {}, trailer: {} }
    });
    inspection.validateSync();
    expect(inspection.defects.truckTractor).toBeDefined();
    expect(inspection.defects.trailer).toBeDefined();
  });
}); 