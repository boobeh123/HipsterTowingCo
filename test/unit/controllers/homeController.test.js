const homeController = require('../../../controllers/home');
const Counter = require('../../../models/Counter');

// Replace Counter entirely — no real database involved
jest.mock('../../../models/Counter');

// ─────────────────────────────────────────────
// getIndex
// ─────────────────────────────────────────────
describe('homeController.getIndex', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { render: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render index.ejs with the current inspection count', async () => {
    Counter.findOne.mockResolvedValue({ name: 'inspectionCount', value: 42 });

    await homeController.getIndex(req, res, next);

    expect(res.render).toHaveBeenCalledWith('index.ejs', { inspectionCount: 42 });
  });

  it('should render index.ejs with 0 when no counter document exists yet', async () => {
    // findOne returns null on first ever load before any PDF has been generated
    Counter.findOne.mockResolvedValue(null);

    await homeController.getIndex(req, res, next);

    expect(res.render).toHaveBeenCalledWith('index.ejs', { inspectionCount: 0 });
  });

  it('should call next with error if Counter.findOne throws', async () => {
    const error = new Error('db error');
    Counter.findOne.mockRejectedValue(error);

    await homeController.getIndex(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.render).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// postInspectionCount
// ─────────────────────────────────────────────
describe('homeController.postInspectionCount', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { json: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should increment the counter and return the updated count', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ name: 'inspectionCount', value: 43 });

    await homeController.postInspectionCount(req, res, next);

    expect(Counter.findOneAndUpdate).toHaveBeenCalledWith(
      { name: 'inspectionCount' },
      { $inc: { value: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    expect(res.json).toHaveBeenCalledWith({ count: 43 });
  });

  it('should create the counter document on the very first increment (upsert)', async () => {
    // upsert: true means this returns a new doc with value 1 on first call
    Counter.findOneAndUpdate.mockResolvedValue({ name: 'inspectionCount', value: 1 });

    await homeController.postInspectionCount(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ count: 1 });
  });

  it('should call next with error if findOneAndUpdate throws', async () => {
    const error = new Error('db error');
    Counter.findOneAndUpdate.mockRejectedValue(error);

    await homeController.postInspectionCount(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
