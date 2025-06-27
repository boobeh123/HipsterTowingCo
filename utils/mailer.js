const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAILNAME,
      pass: process.env.EMAILPASSWORD
    },
    tls: { rejectUnauthorized: false }
  });
};

module.exports = { createTransporter }; 