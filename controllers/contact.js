const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');
const { createTransporter } = require('../utils/mailer');

// Send notification emails (user to pretriq)
const sendAdminNotification = async (contactData) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAILNAME,
    to: process.env.EMAILNAME, 
    subject: `User Submission: ${contactData.subject}`,
    html: `
        <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting pretriq</title>
      <style>
        body {
          background: #f5f7fa;
          margin: 0;
          padding: 0;
          font-family: 'Roboto', Arial, sans-serif;
        }
        .email-container {
          max-width: 480px;
          margin: 2rem auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(102,126,234,0.10);
          padding: 2rem 1.5rem;
        }
        .header {
          color: #185a9d;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          text-align: center;
        }
        .content {
          color: #333;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }
        .message {
          background: #f1f8e9;
          border-left: 4px solid #43cea2;
          padding: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #2e7d32;
        }
        .footer {
          color: #888;
          font-size: 0.95rem;
          text-align: center;
          margin-top: 2rem;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            padding: 1rem 0.5rem;
          }
          .header {
            font-size: 1.2rem;
          }
          .content {
            font-size: 1rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header"><h2><strong>${contactData.subject}</strong></h2></div>
          <div class="content">
            <div class="message">
              <p><strong>From:${contactData.name}</strong> - (${contactData.email}):</p>
              <p><strong>Message:</strong></p>
              <p><em>${contactData.message.replace(/\n/g, '<br>')}</em></p>
            </div>
          </div>
          <div class="footer">
            <hr>
            <p><small>Submitted on: ${new Date().toLocaleString()}</small></p><br>
            <p style="color:#aaa; font-size:0.95rem; margin-top:1.5rem; text-align:center;">You are receiving this email because you contacted Pretriq via our website.<br>If you did not make this request, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

  };

  return transporter.sendMail(mailOptions);
};

// Send confirmation emails (pretriq to user)
const sendUserConfirmation = async (contactData) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAILNAME,
    to: contactData.email,
    subject: 'We have received your response.',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting pretriq</title>
      <style>
        body {
          background: #f5f7fa;
          margin: 0;
          padding: 0;
          font-family: 'Roboto', Arial, sans-serif;
        }
        .email-container {
          max-width: 480px;
          margin: 2rem auto;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(102,126,234,0.10);
          padding: 2rem 1.5rem;
        }
        .header {
          color: #185a9d;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          text-align: center;
        }
        .content {
          color: #333;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }
        .message {
          background: #f1f8e9;
          border-left: 4px solid #43cea2;
          padding: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #2e7d32;
        }
        .footer {
          color: #888;
          font-size: 0.95rem;
          text-align: center;
          margin-top: 2rem;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            padding: 1rem 0.5rem;
          }
          .header {
            font-size: 1.2rem;
          }
          .content {
            font-size: 1rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">Thank you for reaching out to pretriq!</div>
        <div class="content">
          Hi <b>${contactData.name}</b>,<br>
          <p>We've received your message and will get back to you at our earliest convenience.</p>
          <div class="message">
            <b>Your message:</b><br>
            <em>${contactData.message.replace(/\n/g, '<br>')}</em>
          </div>
        </div>
      <div class="footer">
        Best regards,<br>
        The pretriq Team<br>
        <a href="https://pretriq.com" style="color:#185a9d;text-decoration:none;">pretriq.com</a>
      </div>
      <div style="margin-top:2rem; text-align:center;">
        <a href="https://x.com/boobeh123" style="margin:0 8px; display:inline-block;" title="X" target="_blank">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" alt="X" width="28" height="28" style="vertical-align:middle; border-radius:50%;">
        </a>
        <a href="https://github.com/boobeh123/" style="margin:0 8px; display:inline-block;" title="GitHub" target="_blank">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg" alt="GitHub" width="28" height="28" style="vertical-align:middle; border-radius:50%;">
        </a>
        <a href="https://bobby-asakawa.netlify.app/" style="margin:0 8px; display:inline-block;" title="Portfolio" target="_blank">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/internetarchive.svg" alt="Portfolio" width="28" height="28" style="vertical-align:middle; border-radius:50%;">
        </a>
      </div>
      <div style="color:#aaa; font-size:0.95rem; margin-top:1.5rem; text-align:center;">
        You are receiving this email because you contacted Pretriq via our website.<br>
        If you did not make this request, you can safely ignore this email.
      </div>
      </div>
    </body>
    </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

exports.submit = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).send('All fields are required');
      }
      return res.redirect('/?contact_error=missing_fields');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).send('Please provide a valid email address');
      }
      return res.redirect('/?contact_error=invalid_email');
    }

    // Sanitize inputs
    const sanitizedData = {
      name: name.trim().replace(/[<>]/g, ''),
      email: email.trim().toLowerCase(),
      subject: subject.trim().replace(/[<>]/g, ''),
      message: message.trim().replace(/[<>]/g, '')
    };

    // Save to database
    const contact = await Contact.create(sanitizedData);

    // Send emails (don't block the response if email fails)
    try {
      await Promise.all([
        sendAdminNotification(sanitizedData),
        sendUserConfirmation(sanitizedData)
      ]);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Success response
    if (req.headers['content-type'] === 'application/json') {
      return res.status(200).send('Message sent successfully!');
    }
    res.redirect('/?contact_success=1');

  } catch (err) {
    console.error('Contact form error:', err);
    
    if (err.code === 11000) {
      // Duplicate submission (same email + subject + message within short time)
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).send('This message appears to be a duplicate. Please wait a moment before submitting again.');
      }
      return res.redirect('/?contact_error=duplicate');
    }

    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).send('An error occurred while sending your message. Please try again.');
    }
    res.redirect('/?contact_error=server_error');
  }
}; 