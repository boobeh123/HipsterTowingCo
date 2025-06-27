const todosController = require('../controllers/todos');
const User = require('../models/User');
const Inspection = require('../models/Todo');

jest.mock('../middleware/cloudinary', () => ({}));
jest.mock('../models/User');
jest.mock('../models/Todo');

describe('todosController.getTodos', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 'user123' },
      query: {},
    };
    res = {
      render: jest.fn(),
    };
    User.findById.mockReset();
    User.find.mockReset();
    Inspection.find.mockReset();
    Inspection.countDocuments.mockReset();
  });

  it('should render todos.ejs with todos and user data', async () => {
    const fakeUser = { _id: 'user123', name: 'Test User' };
    const fakeTodos = [{ _id: 'todo1', truckTractorNo: '123', createdAt: new Date() }];
    User.findById.mockResolvedValue(fakeUser);
    User.find.mockResolvedValue([]);
    Inspection.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(fakeTodos) }) }) });
    Inspection.countDocuments.mockResolvedValue(1);

    await todosController.getTodos(req, res);
    expect(res.render).toHaveBeenCalledWith('todos.ejs', expect.objectContaining({
      todos: fakeTodos,
      user: fakeUser,
      page: expect.any(String),
      hasMore: false,
      currentPage: 1,
    }));
  });

  it('should render 500 error page on error', async () => {
    User.findById.mockRejectedValue(new Error('DB error'));
    await todosController.getTodos(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
});

describe('todosController.createInspection', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { truckTractorNo: '123', remarks: 'Test', defects: {} },
      user: { id: 'user123' },
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    Inspection.create.mockReset();
  });

  it('should return 400 if validation fails', async () => {
    // Simulate validation error
    const validationResult = require('express-validator').validationResult;
    jest.spyOn(require('express-validator'), 'validationResult').mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'Validation error' }] });
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation error' });
    jest.restoreAllMocks();
  });

  it('should create inspection and return 201 on success', async () => {
    jest.spyOn(require('express-validator'), 'validationResult').mockReturnValue({ isEmpty: () => true });
    Inspection.create.mockResolvedValue({});
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Inspection created successfully.' });
    jest.restoreAllMocks();
  });

  it('should return 500 on DB error', async () => {
    jest.spyOn(require('express-validator'), 'validationResult').mockReturnValue({ isEmpty: () => true });
    Inspection.create.mockRejectedValue(new Error('DB error'));
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Failed to create inspection report.' });
    jest.restoreAllMocks();
  });
});

describe('todosController.deleteInspection', () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: { id: 'todo1' },
      user: { id: 'user123' },
    };
    res = {
      redirect: jest.fn(),
    };
    Inspection.findOne.mockReset();
    Inspection.deleteOne.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should redirect if inspection not found or unauthorized', async () => {
    Inspection.findOne.mockResolvedValue(null);
    await todosController.deleteInspection(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });

  it('should delete inspection and redirect on success', async () => {
    Inspection.findOne.mockResolvedValue({ _id: 'todo1', userId: 'user123' });
    Inspection.deleteOne.mockResolvedValue({});
    await todosController.deleteInspection(req, res);
    expect(console.log).toHaveBeenCalledWith('Deleted Inspection');
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });

  it('should log error and redirect on DB error', async () => {
    Inspection.findOne.mockRejectedValue(new Error('DB error'));
    await todosController.deleteInspection(req, res);
    expect(console.log).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/todos');
  });
});

describe('todosController.searchTodos', () => {
  let req, res;
  beforeEach(() => {
    req = {
      user: { id: 'user123' },
      query: { q: 'search' },
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    Inspection.find.mockReset();
  });

  it('should return inspections as JSON on success', async () => {
    const fakeInspections = [{ _id: 'todo1', truckTractorNo: '123' }];
    Inspection.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(fakeInspections) }) }) });
    await todosController.searchTodos(req, res);
    expect(res.json).toHaveBeenCalledWith({ inspections: fakeInspections });
  });

  it('should return 500 and error message on DB error', async () => {
    Inspection.find.mockImplementation(() => { throw new Error('DB error'); });
    await todosController.searchTodos(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error searching inspections.' });
  });
});

describe('todosController.viewInspection', () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: { id: 'todo1' },
      user: { id: 'user123' },
    };
    res = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    Inspection.findOne.mockReset();
    User.findById.mockReset();
  });

  it('should render todos/view with inspection and user on success', async () => {
    const fakeInspection = { _id: 'todo1', truckTractorNo: '123' };
    const fakeUser = { _id: 'user123', name: 'Test User' };
    Inspection.findOne.mockResolvedValue(fakeInspection);
    User.findById.mockResolvedValue(fakeUser);
    await todosController.viewInspection(req, res);
    expect(res.render).toHaveBeenCalledWith('todos/view', expect.objectContaining({
      inspection: fakeInspection,
      user: fakeUser,
      page: 'FullReport',
    }));
  });

  it('should render 404 if inspection not found', async () => {
    Inspection.findOne.mockResolvedValue(null);
    await todosController.viewInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('errors/404');
  });

  it('should render 500 on DB error', async () => {
    Inspection.findOne.mockRejectedValue(new Error('DB error'));
    await todosController.viewInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('errors/500');
  });
});

describe('todosController.getMoreInspections', () => {
  let req, res;
  beforeEach(() => {
    req = {
      query: { page: '2' },
      user: { id: 'user123' },
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    Inspection.find.mockReset();
    Inspection.countDocuments.mockReset();
  });

  it('should return inspections and hasMore on success', async () => {
    const fakeInspections = [{ _id: 'todo2', truckTractorNo: '456' }];
    Inspection.find.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(fakeInspections) }) }) }) });
    Inspection.countDocuments.mockResolvedValue(5); // e.g., more than 2 pages
    await todosController.getMoreInspections(req, res);
    expect(res.json).toHaveBeenCalledWith({ inspections: fakeInspections, hasMore: true });
  });

  it('should return 500 and error message on DB error', async () => {
    Inspection.find.mockImplementation(() => { throw new Error('DB error'); });
    await todosController.getMoreInspections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching more inspections.' });
  });
}); 