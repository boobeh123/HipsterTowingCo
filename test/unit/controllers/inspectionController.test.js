const inspectionController = require('../../../controllers/inspection');
const Inspection = require('../../../models/Inspection');

jest.mock('../../../models/Inspection');

// ─────────────────────────────────────────────
// postInspection
// ─────────────────────────────────────────────
describe('inspectionController.postInspection', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        truckTractorNo: '12345',
        date: '2026-06-19',
        defects: { truckTractor: { brakes: true }, trailer: {} },
        remarks: '',
        conditionSatisfactory: false,
        defectsCorrected: false,
        defectsNotCorrected: false,
      },
      user: { _id: 'user123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save an inspection and return 201 with the document id', async () => {
    const mockId = 'inspection_abc123';
    Inspection.prototype.save = jest.fn().mockResolvedValue();
    Inspection.mockImplementation(function(data) {
      Object.assign(this, data);
      this._id = mockId;
      this.save = jest.fn().mockResolvedValue();
    });

    await inspectionController.postInspection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, id: mockId });
  });

  it('should set userId from req.user._id, not from req.body', async () => {
    let capturedData = null;
    Inspection.mockImplementation(function(data) {
      capturedData = data;
      this._id = 'abc';
      this.save = jest.fn().mockResolvedValue();
    });

    req.body.userId = 'spoofed-id';

    await inspectionController.postInspection(req, res, next);

    expect(capturedData.userId).toBe('user123');
  });

  it('should return 400 with the validation message when save throws a ValidationError', async () => {
    const validationError = new Error('Inspection validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {
      truckTractorNo: { message: 'Truck number must be at least 1 character long.' },
    };

    Inspection.mockImplementation(function() {
      this._id = 'abc';
      this.save = jest.fn().mockRejectedValue(validationError);
    });

    await inspectionController.postInspection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Truck number must be at least 1 character long.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 with a fallback message when ValidationError has no error detail', async () => {
    const validationError = new Error('Inspection validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {};

    Inspection.mockImplementation(function() {
      this._id = 'abc';
      this.save = jest.fn().mockRejectedValue(validationError);
    });

    await inspectionController.postInspection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with error if save throws a non-validation error', async () => {
    const error = new Error('db error');
    Inspection.mockImplementation(function() {
      this._id = 'abc';
      this.save = jest.fn().mockRejectedValue(error);
    });

    await inspectionController.postInspection(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// deleteInspection
// ─────────────────────────────────────────────
describe('inspectionController.deleteInspection', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'inspection_abc123' },
      user: { _id: 'user123' },
      flash: jest.fn(),
      session: { save: jest.fn(cb => cb(null)) },
    };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete the inspection, flash success, and redirect to /dashboard', async () => {
    Inspection.findOneAndDelete.mockResolvedValue({ _id: 'inspection_abc123' });

    await inspectionController.deleteInspection(req, res, next);

    expect(Inspection.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'inspection_abc123',
      userId: 'user123',
    });
    expect(req.flash).toHaveBeenCalledWith('success', 'Inspection deleted.');
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should scope the query to both _id and userId to prevent deleting other users records', async () => {
    Inspection.findOneAndDelete.mockResolvedValue({ _id: 'inspection_abc123' });

    req.user._id = 'attacker999';

    await inspectionController.deleteInspection(req, res, next);

    expect(Inspection.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'inspection_abc123',
      userId: 'attacker999',
    });
  });

  it('should flash errors and redirect to /dashboard when inspection is not found', async () => {
    Inspection.findOneAndDelete.mockResolvedValue(null);

    await inspectionController.deleteInspection(req, res, next);

    expect(req.flash).toHaveBeenCalledWith('errors', [{ msg: 'Inspection not found.' }]);
    expect(req.session.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should call next with error if findOneAndDelete throws', async () => {
    const error = new Error('db error');
    Inspection.findOneAndDelete.mockRejectedValue(error);

    await inspectionController.deleteInspection(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('should call next with error if session.save fails after a successful delete', async () => {
    Inspection.findOneAndDelete.mockResolvedValue({ _id: 'inspection_abc123' });
    const error = new Error('session error');
    req.session.save = jest.fn(cb => cb(error));

    await inspectionController.deleteInspection(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
