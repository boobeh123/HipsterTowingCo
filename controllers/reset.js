const User = require('../models/User')
const validator = require('validator')
const crypto = require('crypto')
const passport = require('passport')
const nodemailer = require('nodemailer')
const async = require('async')
const { createTransporter } = require('../utils/mailer');


module.exports = {
    getPasswordReset: (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
          } else {
            res.render('forgot.ejs')
          }
    },
    postPasswordReset: async (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/todos');
        }

        const validationErrors = [];
        if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
        if (validationErrors.length) {
            req.flash('errors', validationErrors);
            return res.redirect('/forgot');
        }

        async.waterfall([
            function (done) {
                crypto.randomBytes(20, function (err, buf) {
                    if (err) return done(err);
                    var token = buf.toString('hex');
                    done(null, token);
                });
            },
            function (token, done) {
                User.findOne({ email: req.body.email }, function (err, user) {
                    if (err) return done(err);
                    const errors = [];
                    if (!user) {
                        errors.push({ msg: "No account with that email address exists." });
                        req.flash('errors', errors);
                        return res.redirect('/forgot');
                    }
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000;
                    user.save(function (err) {
                        done(err, token, user);
                    });
                });
            },
            function (token, user, done) {
                const transporter = createTransporter();
                const mailOptions = {
                    from: process.env.EMAILNAME,
                    to: user.email,
                    subject: 'pretriq - Password Reset Instructions',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>pretriq - Password Reset</title>
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
        <div class="header">pretriq - Password Reset Instructions</div>
        <div class="content">
          Hello,<br>
          <p>You are receiving this email because you (or someone else) requested a password reset for your pretriq account.
          
          To reset your password, please click the link below or paste it into your browser: <br><br>
          
          <p style="padding: 1rem; border-bottom: 1px solid black; border-top: 1px solid black;"><a href="http://${req.headers.host}/reset/${token}">http://${req.headers.host}/reset/${token}<a/><p>
          <br><br>
          If you did not request this, you can safely ignore this email and your password will remain unchanged.</p>
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
      </div>
    </body>
    </html>
    `
                };
                transporter.sendMail(mailOptions, function (err) {
                    let info = [];
                    if (err) {
                        info.push({ msg: 'There was an error sending the email. Please try again later.' });
                        req.flash('info', info);
                        return res.redirect('/forgot');
                    }
                    info.push({ msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
                    req.flash('info', info);
                    done(null, 'done');
                });
            }
        ], function (err) {
            if (err) console.error(err);
            res.redirect('/forgot');
        });
    },
    getRecoverPassword: async (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
          } else {
            res.render('recover.ejs', {token: req.params.token})
          }
    },
    postRecoverPassword: async (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
        } else {
            const validationErrors = []
            if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'Password must be at least 8 characters long' })
            if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Passwords do not match' })
            if (validationErrors.length) {
                req.flash('errors', validationErrors)
            }
            async.waterfall([
                function (done) {
                    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
                        if (!user) {
                            req.flash('info', { msg: 'Password reset token is invalid or has expired.' });
                            return res.redirect('back');
                        }
                        if (req.body.password === req.body.confirmPassword) {
                            user.password = req.body.password;
                            user.resetPasswordToken = undefined;
                            user.resetPasswordExpires = undefined;
                            user.save(function (err) {
                                req.logIn(user, function (err) {
                                    done(err, user);
                                });
                            });
                        }
                    });
                },
            ], function (err) {
                res.redirect('/todos');
            })
        }
    }
}