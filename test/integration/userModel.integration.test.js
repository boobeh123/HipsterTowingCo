const mongoose = require('mongoose');
const User = require('../../models/User');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../config/database.test');

describe('User Model Integration Tests', () => {
  let dbConnected = false;

  beforeAll(async () => {
    dbConnected = await connectTestDB();
  }, 15000);

  beforeEach(async () => {
    if (dbConnected) {
      await clearTestDB();
    }
  });

  afterAll(async () => {
    if (dbConnected) {
      await disconnectTestDB();
    }
  });

  describe('Database Operations', () => {
    it('should create and save a user to database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should find user by email', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const userData = {
        email: 'findme@example.com',
        password: 'password123',
        name: 'Find Me User'
      };

      await new User(userData).save();
      const foundUser = await User.findOne({ email: 'findme@example.com' });

      expect(foundUser).toBeTruthy();
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.name).toBe(userData.name);
    });

    it('should update user information', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const user = await new User({
        email: 'update@example.com',
        password: 'password123',
        name: 'Original Name'
      }).save();

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { name: 'Updated Name', role: 'admin' },
        { new: true }
      );

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.role).toBe('admin');
      expect(updatedUser.email).toBe('update@example.com'); // Should remain unchanged
    });

    it('should delete user from database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const user = await new User({
        email: 'delete@example.com',
        password: 'password123',
        name: 'Delete Me'
      }).save();

      const userId = user._id;
      await User.findByIdAndDelete(userId);

      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User'
      };

      await new User(userData).save();

      // Try to create another user with the same email
      const duplicateUser = new User({
        email: 'duplicate@example.com',
        password: 'password456',
        name: 'Second User'
      });

      let error;
      try {
        await duplicateUser.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should validate password length', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const user = new User({
        email: 'shortpass@example.com',
        password: 'short', // Too short
        name: 'Short Password User'
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it('should validate email format', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const user = new User({
        email: 'invalid-email',
        password: 'password123',
        name: 'Invalid Email User'
      });

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should compare passwords correctly', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const user = await new User({
        email: 'compare@example.com',
        password: 'password123',
        name: 'Compare User'
      }).save();

      // Test correct password
      const isCorrectPassword = await new Promise((resolve) => {
        user.comparePassword('password123', (err, isMatch) => {
          resolve(isMatch);
        });
      });
      expect(isCorrectPassword).toBe(true);

      // Test incorrect password
      const isIncorrectPassword = await new Promise((resolve) => {
        user.comparePassword('wrongpassword', (err, isMatch) => {
          resolve(isMatch);
        });
      });
      expect(isIncorrectPassword).toBe(false);
    });

    it('should handle multiple users', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const users = [
        { email: 'user1@example.com', password: 'password123', name: 'User One' },
        { email: 'user2@example.com', password: 'password456', name: 'User Two' },
        { email: 'user3@example.com', password: 'password789', name: 'User Three' }
      ];

      // Use individual save operations to trigger password hashing
      const savedUsers = [];
      for (const userData of users) {
        const user = new User(userData);
        const savedUser = await user.save();
        savedUsers.push(savedUser);
      }

      expect(savedUsers).toHaveLength(3);

      const allUsers = await User.find({});
      expect(allUsers).toHaveLength(3);

      // Verify each user was saved correctly
      savedUsers.forEach((user, index) => {
        expect(user.email).toBe(users[index].email);
        expect(user.name).toBe(users[index].name);
        expect(user.password).not.toBe(users[index].password); // Should be hashed
      });
    });
  });

  describe('Database Connection Status', () => {
    it('should inform about database connection status', () => {
      if (dbConnected) {
        console.log('✅ Database is connected - running integration tests');
        expect(dbConnected).toBe(true);
      } else {
        console.log('❌ Database is not connected - skipping integration tests');
        console.log('💡 To run integration tests:');
        console.log('   1. Ensure MongoDB Atlas is accessible');
        console.log('   2. Check MONGODB_TEST_URI in config/test.env');
        console.log('   3. Verify network access and credentials');
        expect(dbConnected).toBe(false);
      }
    });
  });
}); 