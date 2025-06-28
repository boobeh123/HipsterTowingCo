const mongoose = require('mongoose');

const connectTestDB = async () => {
  try {
    const testMongoURI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pretriq_test';
    
    await mongoose.connect(testMongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Test database connected successfully');
    return true;
  } catch (error) {
    console.error('Test database connection error:', error.message);
    return false;
  }
};

const disconnectTestDB = async () => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Test database disconnected');
    }
  } catch (error) {
    console.error('Test database disconnection error:', error.message);
  }
};

const clearTestDB = async () => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const collections = await mongoose.connection.db.collections();
      
      for (let collection of collections) {
        await collection.deleteMany({});
      }
      
      console.log('Test database cleared');
    }
  } catch (error) {
    console.error('Error clearing test database:', error.message);
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB
}; 