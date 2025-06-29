const todosController = require('../../../controllers/todos');
const User = require('../../../models/User');
const Inspection = require('../../../models/Todo');

jest.mock('../../../middleware/cloudinary', () => ({}));
jest.mock('../../../models/User');
jest.mock('../../../models/Todo');
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

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
    
    // Mock User.findById with lean method
    const mockUserQuery = {
      lean: jest.fn().mockResolvedValue(fakeUser)
    };
    User.findById.mockReturnValue(mockUserQuery);
    
    // Mock User.find with lean method
    const mockUserFindQuery = {
      lean: jest.fn().mockResolvedValue([])
    };
    User.find.mockReturnValue(mockUserFindQuery);
    
    // Mock the chainable query methods
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeTodos)
    };
    Inspection.find.mockReturnValue(mockQuery);
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
    // Mock User.findById to throw an error when lean() is called
    const mockUserQuery = {
      lean: jest.fn().mockRejectedValue(new Error('DB error'))
    };
    User.findById.mockReturnValue(mockUserQuery);
    
    await todosController.getTodos(req, res);
    expect(res.render).toHaveBeenCalledWith('./errors/500.ejs');
  });
});

describe('todosController.createInspection', () => {
  let req, res;
  const { validationResult } = require('express-validator');

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
    validationResult.mockReset();
  });

  it('should return 400 if validation fails', async () => {
    // Simulate validation error
    validationResult.mockReturnValue({ 
      isEmpty: () => false, 
      array: () => [{ msg: 'Validation error' }] 
    });
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation error' });
  });

  it('should create inspection and return 201 on success', async () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    Inspection.create.mockResolvedValue({});
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Inspection created successfully.' });
  });

  it('should return 500 on DB error', async () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    Inspection.create.mockRejectedValue(new Error('DB error'));
    await todosController.createInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Failed to create inspection report.' });
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
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeInspections)
    };
    Inspection.find.mockReturnValue(mockQuery);
    await todosController.searchTodos(req, res);
    expect(res.json).toHaveBeenCalledWith({ inspections: fakeInspections });
  });

  it('should return 500 and error message on DB error', async () => {
    // Mock Inspection.find to throw an error when called
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockImplementation(() => { throw new Error('DB error'); })
    };
    Inspection.find.mockReturnValue(mockQuery);
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
    
    // Mock Inspection.findOne with lean method
    const mockInspectionQuery = {
      lean: jest.fn().mockResolvedValue(fakeInspection)
    };
    Inspection.findOne.mockReturnValue(mockInspectionQuery);
    
    // Mock User.findById with lean method
    const mockUserQuery = {
      lean: jest.fn().mockResolvedValue(fakeUser)
    };
    User.findById.mockReturnValue(mockUserQuery);
    
    await todosController.viewInspection(req, res);
    expect(res.render).toHaveBeenCalledWith('todos/view', expect.objectContaining({
      inspection: fakeInspection,
      user: fakeUser,
      page: 'FullReport',
    }));
  });

  it('should render 404 if inspection not found', async () => {
    const mockInspectionQuery = {
      lean: jest.fn().mockResolvedValue(null)
    };
    Inspection.findOne.mockReturnValue(mockInspectionQuery);
    await todosController.viewInspection(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('errors/404');
  });

  it('should render 500 on DB error', async () => {
    const mockInspectionQuery = {
      lean: jest.fn().mockRejectedValue(new Error('DB error'))
    };
    Inspection.findOne.mockReturnValue(mockInspectionQuery);
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
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeInspections)
    };
    Inspection.find.mockReturnValue(mockQuery);
    Inspection.countDocuments.mockResolvedValue(5); // e.g., more than 2 pages
    await todosController.getMoreInspections(req, res);
    expect(res.json).toHaveBeenCalledWith({ inspections: fakeInspections, hasMore: true });
  });

  it('should return 500 and error message on DB error', async () => {
    // Mock Inspection.find to throw an error when lean() is called
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockImplementation(() => { throw new Error('DB error'); })
    };
    Inspection.find.mockReturnValue(mockQuery);
    await todosController.getMoreInspections(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching more inspections.' });
  });
}); 