const crypto = require('crypto')
const validator = require('validator')
const User = require('../models/User')
const { createTransporter } = require('../utils/mailer')

module.exports = {

    getPasswordReset: async (req, res, next) => {
        try {
            res.render('forgot.ejs')
        } catch(err) {
            next(err)
        }
    },

    postPasswordReset: async (req, res, next) => {
        try {
            if (req.user) {
                return res.redirect('/')
            }

            const validationErrors = []
            if (!validator.isEmail(req.body.email)) {
                validationErrors.push({ msg: 'Please enter a valid email address.' })
            }
            if (validationErrors.length) {
                req.flash('errors', validationErrors)
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            // Resolve base URL — prefer explicit env var over Host header
            // x-forwarded-proto is set by Railway in production
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
            const baseUrl = process.env.BASE_URL || `${protocol}://${req.headers.host}`

            // Generate a secure random token
            const buf = await new Promise((resolve, reject) => {
                crypto.randomBytes(20, (err, buf) => {
                    if (err) return reject(err)
                    resolve(buf)
                })
            })
            const token = buf.toString('hex')

            // Find user and assign token
            const user = await User.findOne({ email: req.body.email })
            if (!user) {
                req.flash('errors', [{ msg: 'No account with that email address exists.' }])
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            // Hash the token before storing — raw token only lives in the email link.
            // If the database is ever compromised, hashed tokens cannot be used directly.
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

            user.resetPasswordToken = hashedToken
            user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
            await user.save()

            // Send reset email
            const transporter = createTransporter()
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
                            body { background: #f5f7fa; margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; }
                            .email-container { max-width: 480px; margin: 2rem auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(102,126,234,0.10); padding: 2rem 1.5rem; }
                            .header { color: #185a9d; font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; text-align: center; }
                            .content { color: #333; font-size: 1.1rem; margin-bottom: 1.5rem; }
                            .footer { color: #888; font-size: 0.95rem; text-align: center; margin-top: 2rem; }
                            @media only screen and (max-width: 600px) {
                                .email-container { padding: 1rem 0.5rem; }
                                .header { font-size: 1.2rem; }
                                .content { font-size: 1rem; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            <div class="header">pretriq &mdash; Password Reset</div>
                            <div class="content">
                                <p>You are receiving this email because a password reset was requested for your pretriq account.</p>
                                <p>Click the link below or paste it into your browser to reset your password. This link expires in <strong>1 hour</strong>.</p>
                                <p style="padding: 1rem; border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; word-break: break-all;">
                                    <a href="${baseUrl}/reset/${token}">${baseUrl}/reset/${token}</a>
                                </p>
                                <p>If you did not request this, you can safely ignore this email and your password will remain unchanged.</p>
                            </div>
                            <div class="footer">
                                The pretriq Team &mdash;
                                <a href="https://pretriq.com" style="color:#185a9d; text-decoration:none;">pretriq.com</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            }

            await transporter.sendMail(mailOptions)

            req.flash('info', [{ msg: `A reset link has been sent to ${user.email}. It expires in 1 hour.` }])
            req.session.save((err) => {
                if (err) { return next(err) }
                res.redirect('/forgot')
            })

        } catch(err) {
            next(err)
        }
    },

    getRecoverPassword: async (req, res, next) => {
        try {
            if (req.user) {
                return res.redirect('/')
            }
            res.render('recover.ejs', { token: req.params.token })
        } catch(err) {
            next(err)
        }
    },

    postRecoverPassword: async (req, res, next) => {
        try {
            if (req.user) {
                return res.redirect('/')
            }

            const validationErrors = []
            if (!validator.isLength(req.body.password, { min: 5 })) {
                validationErrors.push({ msg: 'Password must be at least 5 characters long.' })
            }
            if (req.body.password !== req.body.confirmPassword) {
                validationErrors.push({ msg: 'Passwords do not match.' })
            }
            if (validationErrors.length) {
                req.flash('errors', validationErrors)
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('back')
                })
            }

            // Hash the incoming token to match against the stored hash
            const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

            // Find user by valid, unexpired token
            const user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() }
            })

            if (!user) {
                req.flash('errors', [{ msg: 'Password reset token is invalid or has expired.' }])
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            // Set new password and clear token fields
            user.password = req.body.password
            user.resetPasswordToken = undefined
            user.resetPasswordExpires = undefined
            await user.save()

            // Log the user in automatically after reset
            req.login(user, function(err) {
                if (err) { return next(err) }
                req.flash('success', 'Your password has been updated.')
                req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/')
                })
            })

        } catch(err) {
            next(err)
        }
    }

}
