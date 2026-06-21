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
        Inspection.countDocuments
            .mockResolvedValueOnce(6)  // totalInspections
            .mockResolvedValueOnce(4); // inspectionsWithDefects
        Inspection.findOne.mockReturnValue(mockFindOne({ date: '6/20/2026', createdAt: new Date() }));
        Inspection.find.mockReturnValue(mockFind([
            { _id: 'abc', truckTractorNo: '12345', trailerNo: '', date: '6/20/2026', conditionSatisfactory: true }
        ]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            totalInspections: 6,
            inspectionsWithDefects: 4,
            inspectionCount: 42,
            currentPage: 1,
        }));
    });

    it('should default inspectionCount to 0 when no counter document exists', async () => {
        Counter.findOne.mockResolvedValue(null);
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            inspectionCount: 0,
            totalInspections: 0,
        }));
    });

    it('should set lastInspectionDate to null when no inspections exist', async () => {
        Counter.findOne.mockResolvedValue(null);
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
        Counter.findOne.mockResolvedValue(null);
        Inspection.countDocuments.mockResolvedValue(1);
        Inspection.findOne.mockReturnValue(mockFindOne({ date, createdAt: new Date() }));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            lastInspectionDate: date,
        }));
    });

    it('should default to page 1 when no page query param is provided', async () => {
        Counter.findOne.mockResolvedValue(null);
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
        Counter.findOne.mockResolvedValue(null);
        Inspection.countDocuments.mockResolvedValue(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            currentPage: 1,
        }));
    });

    it('should calculate totalPages correctly', async () => {
        Counter.findOne.mockResolvedValue(null);
        Inspection.countDocuments
            .mockResolvedValueOnce(25) // 25 inspections = 3 pages at 10 per page
            .mockResolvedValueOnce(0);
        Inspection.findOne.mockReturnValue(mockFindOne(null));
        Inspection.find.mockReturnValue(mockFind([]));

        await dashboardController.getDashboard(req, res, next);

        expect(res.render).toHaveBeenCalledWith('dashboard.ejs', expect.objectContaining({
            totalPages: 3,
        }));
    });

    it('should call next with error if a query throws', async () => {
        Counter.findOne.mockRejectedValue(new Error('db error'));

        await dashboardController.getDashboard(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(res.render).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────
// getInspection
// ─────────────────────────────────────────────
describe('dashboardController.getInspection', () => {
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

        await dashboardController.getInspection(req, res, next);

        expect(Inspection.findOne).toHaveBeenCalledWith({
            _id: 'inspection_abc',
            userId: 'user123',
        });
        expect(res.json).toHaveBeenCalledWith(mockInspection);
    });

    it('should return 404 when inspection is not found or userId does not match', async () => {
        Inspection.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

        await dashboardController.getInspection(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Inspection not found.' });
    });

    it('should call next with error if findOne throws', async () => {
        const error = new Error('db error');
        Inspection.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(error) });

        await dashboardController.getInspection(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.json).not.toHaveBeenCalled();
    });
});
