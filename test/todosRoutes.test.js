const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { ensureAuth } = require('../middleware/auth');
const todosController = require('../controllers/todos');

jest.mock('../middleware/auth', () => ({
  ensureAuth: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  })
}));

jest.mock('../controllers/todos', () => ({
  getTodos: jest.fn((req, res) => res.status(200).json({ message: 'Todos page' })),
  getMoreInspections: jest.fn((req, res) => res.status(200).json({ inspections: [] })),
  viewInspection: jest.fn((req, res) => res.status(200).json({ message: 'View inspection' })),
  searchTodos: jest.fn((req, res) => res.status(200).json({ inspections: [] })),
  createInspection: jest.fn((req, res) => res.status(201).json({ message: 'Inspection created' })),
  deleteInspection: jest.fn((req, res) => res.status(200).json({ message: 'Inspection deleted' }))
}));

describe('Todos Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    const todosRoutes = require('../routes/todos');
    app.use('/todos', todosRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /todos', () => {
    it('should call ensureAuth middleware and todosController.getTodos', async () => {
      const response = await request(app)
        .get('/todos')
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.getTodos).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Todos page' });
    });

    it('should pass user object to controller', async () => {
      await request(app)
        .get('/todos')
        .expect(200);

      const callArgs = todosController.getTodos.mock.calls[0];
      expect(callArgs[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('GET /todos/loadmore', () => {
    it('should call ensureAuth middleware and todosController.getMoreInspections', async () => {
      const response = await request(app)
        .get('/todos/loadmore?page=2')
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.getMoreInspections).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ inspections: [] });
    });

    it('should pass query parameters to controller', async () => {
      await request(app)
        .get('/todos/loadmore?page=3')
        .expect(200);

      const callArgs = todosController.getMoreInspections.mock.calls[0];
      expect(callArgs[0].query).toEqual({ page: '3' });
      expect(callArgs[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('GET /todos/view/:id', () => {
    it('should call ensureAuth middleware and todosController.viewInspection', async () => {
      const inspectionId = 'test-inspection-id';

      const response = await request(app)
        .get(`/todos/view/${inspectionId}`)
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.viewInspection).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'View inspection' });
    });

    it('should pass inspection ID parameter to controller', async () => {
      const inspectionId = 'test-inspection-id';

      await request(app)
        .get(`/todos/view/${inspectionId}`)
        .expect(200);

      const callArgs = todosController.viewInspection.mock.calls[0];
      expect(callArgs[0].params).toEqual({ id: inspectionId });
      expect(callArgs[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('GET /todos/search', () => {
    it('should call ensureAuth middleware and todosController.searchTodos', async () => {
      const response = await request(app)
        .get('/todos/search?q=truck')
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.searchTodos).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ inspections: [] });
    });

    it('should pass search query to controller', async () => {
      await request(app)
        .get('/todos/search?q=truck')
        .expect(200);

      const callArgs = todosController.searchTodos.mock.calls[0];
      expect(callArgs[0].query).toEqual({ q: 'truck' });
      expect(callArgs[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('POST /todos/createInspection', () => {
    it('should call ensureAuth middleware, validation, and todosController.createInspection', async () => {
      const inspectionData = {
        truckTractorNo: 'USDOT123456',
        trailerNo: 'TRAILER789',
        remarks: 'All systems operational',
        defects: {
          truckTractor: {
            lights: true,
            brakes: false
          },
          trailer: {
            tires: false
          }
        }
      };

      const response = await request(app)
        .post('/todos/createInspection')
        .send(inspectionData)
        .expect(201);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.createInspection).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Inspection created' });
    });
  });

  describe('DELETE /todos/:id', () => {
    it('should call ensureAuth middleware and todosController.deleteInspection', async () => {
      const inspectionId = 'test-inspection-id';

      const response = await request(app)
        .delete(`/todos/${inspectionId}`)
        .expect(200);

      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(todosController.deleteInspection).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Inspection deleted' });
    });

    it('should pass inspection ID parameter to controller', async () => {
      const inspectionId = 'test-inspection-id';

      await request(app)
        .delete(`/todos/${inspectionId}`)
        .expect(200);

      const callArgs = todosController.deleteInspection.mock.calls[0];
      expect(callArgs[0].params).toEqual({ id: inspectionId });
      expect(callArgs[0].user).toEqual({ id: 'test-user-id' });
    });
  });

  describe('Middleware execution order', () => {
    it('should execute ensureAuth before controller', async () => {
      const executionOrder = [];
      
      ensureAuth.mockImplementation((req, res, next) => {
        executionOrder.push('ensureAuth');
        req.user = { id: 'test-user-id' };
        next();
      });

      todosController.getTodos.mockImplementation((req, res) => {
        executionOrder.push('controller');
        res.status(200).json({ message: 'Todos page' });
      });

      await request(app)
        .get('/todos')
        .expect(200);

      expect(executionOrder).toEqual(['ensureAuth', 'controller']);
    });
  });

  describe('Authentication failure', () => {
    it('should handle authentication failure', async () => {
      ensureAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/todos')
        .expect(401);
    });
  });
}); 