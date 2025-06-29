const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const logger = require('morgan');
const methodOverride = require("method-override");
const path = require('path');

// Import routes
const mainRoutes = require('../../routes/main');
const todoRoutes = require('../../routes/todos');
const profileRoutes = require('../../routes/profile');
const contactRoutes = require('../../routes/contact');

// Import test database config
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../config/database.test');

const createTestServer = async () => {
  const app = express();
  
  // Try to connect to test database with timeout
  let dbConnected = false;
  try {
    console.log('🔄 Attempting to connect to test database...');
    dbConnected = await Promise.race([
      connectTestDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
  } catch (error) {
    console.log('⚠️ Database connection failed, continuing with mock data:', error.message);
    dbConnected = false;
  }
  
  // Allow moment to be used in templating engine
  app.locals.moment = require('moment');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../../views'));
  
  // Middleware
  app.use(express.static('public'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(logger('dev'));
  app.use(methodOverride("_method"));
  
  // Sessions with test database (only if connected)
  if (dbConnected) {
    app.use(
      session({
        secret: 'test-secret-key',
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({ mongooseConnection: mongoose.connection }),
      })
    );
  } else {
    // Fallback session without database
    app.use(
      session({
        secret: 'test-secret-key',
        resave: false,
        saveUninitialized: false,
      })
    );
  }
  
  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  
  // Routes
  app.use('/', mainRoutes);
  app.use('/todos', todoRoutes);
  app.use('/profile', profileRoutes);
  app.use('/contact', contactRoutes);
  
  // Error handling routes
  app.use((req, res) => {
    res.status(404).render('errors/404');
  });
  
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500');
  });
  
  return app;
};

const cleanupTestServer = async () => {
  try {
    // Check if connection exists and is connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await clearTestDB();
      await disconnectTestDB();
    } else {
      console.log('⚠️ No active database connection to cleanup');
    }
  } catch (error) {
    console.log('⚠️ Database cleanup failed:', error.message);
  }
};

module.exports = {
  createTestServer,
  cleanupTestServer
}; 