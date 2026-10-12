const inspectionController = require('../../../controllers/inspection');
const Inspection = require('../../../models/Inspection');
const { validateInspection } = require('../../../middleware/validators');
const runValidators = require('../helpers/runValidators');

jest.mock('../../../models/Inspection');

// ─────────────────────────────────────────────
// getInspection
// ─────────────────────────────────────────────
describe('inspectionController.getInspection', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: 'user123' },
      params: { id: 'inspection_abc' },
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the inspection as JSON when userId matches', async () => {
    const mockInspection = { _id: 'inspection_abc', truckTractorNo: '12345', userId: 'user123' };
    Inspection.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockInspection) });

    await inspectionController.getInspection(req, res, next);

    expect(Inspection.findOne).toHaveBeenCalledWith({
      _id: 'inspection_abc',
      userId: 'user123',
    });
    expect(res.json).toHaveBeenCalledWith(mockInspection);
  });

  it('should scope the query to both _id and userId to prevent reading other users records', async () => {
    Inspection.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await inspectionController.getInspection(req, res, next);

    expect(Inspection.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user123' })
    );
  });

  it('should return 404 when inspection is not found or userId does not match', async () => {
    Inspection.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await inspectionController.getInspection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Inspection not found.' });
  });

  it('should return 404 rather than 500 when the id is a malformed ObjectId', async () => {
    const castError = new Error('Cast to ObjectId failed');
    castError.name = 'CastError';
    Inspection.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(castError) });

    await inspectionController.getInspection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Inspection not found.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with error if findOne throws something other than a CastError', async () => {
    const error = new Error('db error');
    Inspection.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(error) });

    await inspectionController.getInspection(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// postInspection
// ─────────────────────────────────────────────
describe('inspectionController.postInspection', () => {
  let req, res, next;

  // Runs the route's validators, then the controller
  const postInspection = async () => {
    await runValidators(validateInspection, req);
    await inspectionController.postInspection(req, res, next);
  };

  // Records what the controller passes to new Inspection()
  const captureInspection = () => {
    const captured = {};
    Inspection.mockImplementation(function(data) {
      captured.data = data;
      this._id = 'abc';
      this.save = jest.fn().mockResolvedValue();
    });
    return captured;
  };

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

    await postInspection();

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

    await postInspection();

    expect(capturedData.userId).toBe('user123');
  });

  // Spreading req.body used to let a client set any field the schema has
  it('should ignore createdAt, _id and other fields the form does not have', async () => {
    const captured = captureInspection();
    Object.assign(req.body, {
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      id: '1772771025543',
      userId: 'someone-else',
    });

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(201);
    ['createdAt', 'updatedAt', '_id', 'id'].forEach((field) => {
      expect(captured.data).not.toHaveProperty(field);
    });
    expect(captured.data.userId).toBe('user123');
    expect(captured.data).toMatchObject({ truckTractorNo: '12345', date: '2026-06-19' });
  });

  // ── Drawn signatures (the form's signature pads) ──
  // The first bytes of a real PNG, as base64
  const PNG_DATA_URL = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');

  it('should save drawn signatures that are PNG images', async () => {
    const captured = captureInspection();
    req.body.driverSignature = PNG_DATA_URL;
    req.body.mechanicSignature = PNG_DATA_URL;

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(captured.data.driverSignature).toBe(PNG_DATA_URL);
    expect(captured.data.mechanicSignature).toBe(PNG_DATA_URL);
  });

  it.each([
    ['plain text', 'Jordan Rivera'],
    ['an SVG image', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['GIF bytes labelled as PNG', 'data:image/png;base64,' + Buffer.from('GIF89a000000').toString('base64')],
    ['broken base64', 'data:image/png;base64,iVBORw0KGgo<script>'],
  ])('should refuse a signature that is %s', async (label, value) => {
    req.body.driverSignature = value;

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Signatures must be PNG images drawn on the form.' });
    expect(Inspection).not.toHaveBeenCalled();
  });

  it('should refuse a signature over 60,000 characters', async () => {
    req.body.mechanicSignature = PNG_DATA_URL + 'A'.repeat(60000);

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'A signature was too large. Please clear it and sign again.' });
  });

  it('should return 400 without saving when the truck number is missing', async () => {
    delete req.body.truckTractorNo;

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Truck / Tractor No. is required.' });
    expect(Inspection).not.toHaveBeenCalled();
  });

  it('should return 400 without saving when the truck number is not text', async () => {
    req.body.truckTractorNo = { $gt: '' };

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Truck / Tractor No. is required.' });
    expect(Inspection).not.toHaveBeenCalled();
  });

  it('should return 400 without saving when remarks are longer than 2000 characters', async () => {
    req.body.remarks = 'x'.repeat(2001);

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Remarks can be up to 2000 characters.' });
    expect(Inspection).not.toHaveBeenCalled();
  });

  // The modal's checkboxes arrive as the string "true" when ticked
  it('should turn ticked checkboxes into booleans and trim text', async () => {
    const captured = captureInspection();
    req.body.truckTractorNo = '  12345  ';
    req.body.conditionSatisfactory = 'true';
    req.body.defects = { truckTractor: { brakes: 'true' }, trailer: { tires: true } };

    await postInspection();

    expect(captured.data.truckTractorNo).toBe('12345');
    expect(captured.data.conditionSatisfactory).toBe(true);
    expect(captured.data.defects).toEqual({ truckTractor: { brakes: true }, trailer: { tires: true } });
  });

  it('should return 400 when a checkbox holds something other than true or false', async () => {
    req.body.defects = { truckTractor: { brakes: 'yes please' } };

    await postInspection();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Inspection).not.toHaveBeenCalled();
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

    await postInspection();

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

    await postInspection();

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

    await postInspection();

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
