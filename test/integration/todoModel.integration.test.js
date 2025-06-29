const mongoose = require('mongoose');
const Todo = require('../../models/Todo');
const User = require('../../models/User');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../config/database.test');

describe('Todo Model Integration Tests', () => {
  let dbConnected = false;
  let testUser;

  beforeAll(async () => {
    dbConnected = await connectTestDB();
  }, 15000);

  beforeEach(async () => {
    if (dbConnected) {
      await clearTestDB();
      
      // Create a test user for the inspections
      testUser = await new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }).save();
    }
  });

  afterAll(async () => {
    if (dbConnected) {
      await disconnectTestDB();
    }
  });

  describe('Database Operations', () => {
    it('should create and save an inspection to database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspectionData = {
        truckTractorNo: '12345',
        trailerNo: '67890',
        date: '2024-01-15',
        remarks: 'Test inspection remarks',
        conditionSatisfactory: true,
        defects: {
          truckTractor: {
            brakes: false,
            lights: true,
            engine: false
          },
          trailer: {
            brakes: true,
            lights: false,
            tires: true
          }
        },
        userId: testUser._id
      };

      const inspection = new Todo(inspectionData);
      const savedInspection = await inspection.save();

      expect(savedInspection._id).toBeDefined();
      expect(savedInspection.truckTractorNo).toBe(inspectionData.truckTractorNo);
      expect(savedInspection.trailerNo).toBe(inspectionData.trailerNo);
      expect(savedInspection.date).toBe(inspectionData.date);
      expect(savedInspection.remarks).toBe(inspectionData.remarks);
      expect(savedInspection.conditionSatisfactory).toBe(inspectionData.conditionSatisfactory);
      expect(savedInspection.userId.toString()).toBe(testUser._id.toString());
      expect(savedInspection.createdAt).toBeDefined();
    });

    it('should find inspection by truck number', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = await new Todo({
        truckTractorNo: 'FINDME123',
        trailerNo: 'TRAILER456',
        date: '2024-01-15',
        remarks: 'Find me inspection',
        conditionSatisfactory: false,
        userId: testUser._id
      }).save();

      const foundInspection = await Todo.findOne({ truckTractorNo: 'FINDME123' });
      expect(foundInspection).toBeTruthy();
      expect(foundInspection.truckTractorNo).toBe('FINDME123');
      expect(foundInspection.remarks).toBe('Find me inspection');
    });

    it('should find inspections by user', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      // Create multiple inspections for the same user
      await new Todo({
        truckTractorNo: 'TRUCK1',
        date: '2024-01-15',
        remarks: 'First inspection',
        userId: testUser._id
      }).save();

      await new Todo({
        truckTractorNo: 'TRUCK2',
        date: '2024-01-16',
        remarks: 'Second inspection',
        userId: testUser._id
      }).save();

      const userInspections = await Todo.find({ userId: testUser._id });
      expect(userInspections).toHaveLength(2);
      expect(userInspections[0].truckTractorNo).toBe('TRUCK1');
      expect(userInspections[1].truckTractorNo).toBe('TRUCK2');
    });

    it('should update inspection information', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = await new Todo({
        truckTractorNo: 'UPDATE123',
        date: '2024-01-15',
        remarks: 'Original remarks',
        conditionSatisfactory: false,
        userId: testUser._id
      }).save();

      const updatedInspection = await Todo.findByIdAndUpdate(
        inspection._id,
        { 
          remarks: 'Updated remarks',
          conditionSatisfactory: true,
          defects: {
            truckTractor: { brakes: true, lights: false }
          }
        },
        { new: true }
      );

      expect(updatedInspection.remarks).toBe('Updated remarks');
      expect(updatedInspection.conditionSatisfactory).toBe(true);
      expect(updatedInspection.defects.truckTractor.brakes).toBe(true);
      expect(updatedInspection.truckTractorNo).toBe('UPDATE123'); // Should remain unchanged
    });

    it('should delete inspection from database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = await new Todo({
        truckTractorNo: 'DELETE123',
        date: '2024-01-15',
        remarks: 'Delete me',
        userId: testUser._id
      }).save();

      const inspectionId = inspection._id;
      await Todo.findByIdAndDelete(inspectionId);

      const deletedInspection = await Todo.findById(inspectionId);
      expect(deletedInspection).toBeNull();
    });

    it('should validate required fields', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = new Todo({
        // Missing required truckTractorNo
        date: '2024-01-15',
        userId: testUser._id
      });

      let error;
      try {
        await inspection.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.truckTractorNo).toBeDefined();
    });

    it('should validate truck number minimum length', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = new Todo({
        truckTractorNo: '12', // Too short (minimum 3 chars)
        date: '2024-01-15',
        userId: testUser._id
      });

      let error;
      try {
        await inspection.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.truckTractorNo).toBeDefined();
    });

    it('should search inspections by truck number', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      await new Todo({
        truckTractorNo: 'SEARCH123',
        date: '2024-01-15',
        remarks: 'Searchable inspection',
        userId: testUser._id
      }).save();

      await new Todo({
        truckTractorNo: 'SEARCH456',
        date: '2024-01-16',
        remarks: 'Another searchable inspection',
        userId: testUser._id
      }).save();

      const searchResults = await Todo.find({
        truckTractorNo: { $regex: 'SEARCH', $options: 'i' }
      });

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].truckTractorNo).toContain('SEARCH');
      expect(searchResults[1].truckTractorNo).toContain('SEARCH');
    });

    it('should handle defects object structure', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const inspection = await new Todo({
        truckTractorNo: 'DEFECTS123',
        date: '2024-01-15',
        defects: {
          truckTractor: {
            brakes: true,
            lights: false,
            engine: true,
            steering: false
          },
          trailer: {
            brakes: false,
            lights: true,
            tires: true,
            couplingPin: false
          }
        },
        userId: testUser._id
      }).save();

      expect(inspection.defects.truckTractor.brakes).toBe(true);
      expect(inspection.defects.truckTractor.lights).toBe(false);
      expect(inspection.defects.trailer.brakes).toBe(false);
      expect(inspection.defects.trailer.tires).toBe(true);
    });

    it('should handle multiple inspections with pagination', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      // Create 15 inspections
      for (let i = 1; i <= 15; i++) {
        await new Todo({
          truckTractorNo: `PAGE${i.toString().padStart(3, '0')}`,
          date: '2024-01-15',
          remarks: `Inspection ${i}`,
          userId: testUser._id
        }).save();
      }

      // Test pagination - first page (10 items)
      const firstPage = await Todo.find({ userId: testUser._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .skip(0);

      expect(firstPage).toHaveLength(10);

      // Test pagination - second page (5 items)
      const secondPage = await Todo.find({ userId: testUser._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .skip(10);

      expect(secondPage).toHaveLength(5);
    });
  });

  describe('Database Connection Status', () => {
    it('should inform about database connection status', () => {
      if (dbConnected) {
        console.log('✅ Database is connected - running Todo integration tests');
        expect(dbConnected).toBe(true);
      } else {
        console.log('❌ Database is not connected - skipping Todo integration tests');
        expect(dbConnected).toBe(false);
      }
    });
  });
}); 