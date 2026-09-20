const dashboardController = require('../../../controllers/dashboard');
const Inspection = require('../../../models/Inspection');
const Counter = require('../../../models/Counter');

jest.mock('../../../models/Inspection');
jest.mock('../../../models/Counter');

// ─────────────────────────────────────────────
// getDashboard
// ─────────────────────────────────────────────
describe('dashboardController.getDashboard', () => {
    let req, res, next;

    // Chainable Mongoose mock helpers
    const mockFind = (returnValue) => {
        const chain = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(returnValue),
        };
        return chain;
    };

    const mockFindOne = (returnValue) => {
        const chain = {
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(returnValue),
        };
        return chain;
    };

    beforeEach(() => {
        req = {
            user: { _id: 'user123' },
            query: {},
        };
        res = { render: jest.fn() };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render dashboard.ejs with stats and inspections', async () => {
        Counter.findOne.mockResolvedValue({ value: 42 });
        Inspection.countDocuments.mockResolvedValue(6);
        Inspection.findOne.mockReturnValue(mockFindOne({ date: '6/20/2026', createdAt: new Date() }));
        Inspection.find.mockReturnValue(mockFind([
            { _id: 'abc', truckTractorNo: '12345', trailerNo: '', date: '6/20/2026', conditionSatisfactory: true }
        ]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            totalInspections: 6,
            inspectionCount: 42,
            currentPage: 1,
        }));
    });

    // inspectionCount feeds inspectionModal.ejs, which dashboard.ejs includes.
    // Dropping it renders a 500, so it is pinned here deliberately.
    it('should pass inspectionCount through for the modal partial', async () => {
        Counter.findOne.mockResolvedValue({ value: 7 });
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        const payload = res.render.mock.calls[0][1];
        expect(payload).toHaveProperty('inspectionCount', 7);
    });

    it('should default inspectionCount to 0 when no counter document exists', async () => {
        Counter.findOne.mockResolvedValue(null);
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            inspectionCount: 0,
        }));
    });

    it('should not run the unrendered defects count', async () => {
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        // One countDocuments only: totalInspections. The 8-clause $or that
        // nothing rendered used to be a second call here.
        expect(Inspection.countDocuments).toHaveBeenCalledTimes(1);
        expect(Inspection.countDocuments).toHaveBeenCalledWith({ userId: 'user123' });
        expect(res.render.mock.calls[0][1]).not.toHaveProperty('inspectionsWithDefects');
    });

    it('should scope every query to the requesting user', async () => {
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(Inspection.countDocuments).toHaveBeenCalledWith({ userId: 'user123' });
        expect(Inspection.findOne).toHaveBeenCalledWith({ userId: 'user123' });
        expect(Inspection.find).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('should set lastInspectionDate to null when no inspections exist', async () => {
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            lastInspectionDate: null,
        }));
    });

    it('should prefer inspection.date over createdAt for lastInspectionDate', async () => {
        const date = '6/20/2026';
        Inspection.countDocuments.mockResolvedValue(1);
        Inspection.findOne.mockReturnValue(mockFindOne({ date, createdAt: new Date() }));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            lastInspectionDate: date,
        }));
    });

    it('should default to page 1 when no page query param is provided', async () => {
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            currentPage: 1,
        }));
    });

    it('should clamp page to 1 when an invalid page value is provided', async () => {
        req.query.page = '-5';
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            currentPage: 1,
        }));
    });

    it('should calculate totalPages correctly', async () => {
        Inspection.countDocuments.mockResolvedValue(25); // 25 inspections = 3 pages at 10 per page
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            totalPages: 3,
        }));
    });

    it('should call next with error if a query throws', async () => {
        Inspection.countDocuments.mockRejectedValue(new Error('db error'));
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(res.render).not.toHaveBeenCalled();
    });
});

// getInspection moved to controllers/inspection.js in a409f7d.
// Its tests now live in test/unit/controllers/inspectionController.test.js
