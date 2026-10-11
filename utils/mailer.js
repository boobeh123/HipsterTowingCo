const nodemailer = require('nodemailer');

// service: 'gmail' supplies Gmail's host, port 465 and TLS settings. Certificate
// checks stay on: turning them off would let anyone between this server and
// Gmail pose as Gmail and read the app password when the transport logs in.
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAILNAME,
      pass: process.env.EMAILPASSWORD
    }
  });
};

module.exports = { createTransporter };
