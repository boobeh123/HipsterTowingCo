const inspectionController = require('../../../controllers/inspection');
const Inspection = require('../../../models/Inspection');

jest.mock('../../../models/Inspection');

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
    // Mock the _id that Mongoose assigns on save
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

    // Even if body tries to send a different userId, it should be overridden
    req.body.userId = 'spoofed-id';

    await inspectionController.postInspection(req, res, next);

    expect(capturedData.userId).toBe('user123');
  });

  it('should call next with error if save throws', async () => {
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
