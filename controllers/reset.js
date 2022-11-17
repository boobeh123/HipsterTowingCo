const User = require('../models/User')
const validator = require('validator')
const crypto = require('crypto')
const passport = require('passport')
const nodemailer = require('nodemailer')
const async = require('async')


module.exports = {
    getPasswordReset: (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
          } else {
            res.render('forgot.ejs')
          }
    },
    postPasswordReset: async (req,res)=>{
        if (req.isAuthenticated()) {
            res.redirect('/todos')
        } else {
            const validationErrors = []
            if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' })
            if (validationErrors.length) {
                req.flash('errors', validationErrors)
                return res.redirect('/forgot')
            }
            async.waterfall([
                function (done) {
                    crypto.randomBytes(20, function (err, buf) {
                        var token = buf.toString('hex');
                        done(err, token);
                    });
                },
                function (token, done) {
                    User.findOne({ email: req.body.email }, function (err, user) {
                        const errors = []
                        if (!user) {
                            errors.push({ msg: "No account with that email address exists." })
                        }
                        if (errors.length) {
                            req.flash('errors', errors);
                            return res.redirect('/forgot');
                        }
                        user.resetPasswordToken = token;
                        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour          
                        user.save(function (err) {
                            done(err, token, user);
                        });
                    });
                },
                function (token, user, done) {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAILNAME,
                            pass: process.env.EMAILPASSWORD
                        },
                        tls : { rejectUnauthorized: false }
                    })
                    const mailOptions = {
                        to: user.email,
                        from: process.env.EMAILNAME,
                        subject: 'Bo-TOW Password Reset Request',
                        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                              'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                              'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                            };
                    transporter.sendMail(mailOptions, function (err) {
                        req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                        done(err, 'done');
                    });
                }
            ], function (err) {
                if (err) console.error(err);
                res.redirect('/');
            })
        }
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