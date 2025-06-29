const mongoose = require('mongoose');

const connectTestDB = async () => {
  try {
    // Use separate test database - NEVER use production DB
    const testMongoURI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pretriq_test';
    
    // Add timeout to prevent hanging
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 5000,
    };
    
    await mongoose.connect(testMongoURI, connectionOptions);
    
    console.log('✅ Test database connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Test database connection failed:', error.message);
    console.log('💡 To run database tests:');
    console.log('   1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/');
    console.log('   2. Or set MONGODB_TEST_URI environment variable');
    console.log('   3. Or use MongoDB Memory Server for automatic test DB');
    return false;
  }
};

const disconnectTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Test database disconnected');
    }
  } catch (error) {
    console.log('⚠️ Test database disconnection failed:', error.message);
  }
};

const clearTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collections = await mongoose.connection.db.collections();
      for (let collection of collections) {
        await collection.deleteMany({});
      }
      console.log('✅ Test database cleared');
    }
  } catch (error) {
    console.log('⚠️ Test database clear failed:', error.message);
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB
}; 