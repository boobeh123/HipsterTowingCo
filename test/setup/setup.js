// Load test environment variables
require('dotenv').config({ path: './config/test.env' });

// Set test environment
process.env.NODE_ENV = 'test';
 
console.log('🧪 Test environment loaded');
console.log('📊 Database URI:', process.env.MONGODB_TEST_URI ? 'Configured' : 'Not configured');
console.log('🔧 Test port:', process.env.PORT || 3001); 