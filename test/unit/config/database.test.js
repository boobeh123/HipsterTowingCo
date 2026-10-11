const mongoose = require('mongoose');
require('../../../config/database');

describe('config/database', () => {
  // Without this, a request body like { email: { $ne: null } } could reach
  // a query as an operator instead of a value
  it('should turn on sanitizeFilter as soon as the module loads', () => {
    expect(mongoose.get('sanitizeFilter')).toBe(true);
  });
});
