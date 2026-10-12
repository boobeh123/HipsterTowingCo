const crypto = require('crypto')
const mongoose = require('mongoose')
const { matchedData } = require('express-validator')
const User = require('../models/User')
const { formErrors } = require('../middleware/validators')
const { markLoginTime } = require('../middleware/auth')
const { createTransporter } = require('../utils/mailer')

// Hash a token before storing or looking it up. The raw token only lives in
// the email link, so a leaked database copy holds nothing usable.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

// The account a reset link belongs to, if the link hasn't expired.
// mongoose.trusted() tells the sanitizeFilter guard in config/database.js
// that this $gt is the app's own, not something sent in a request.
// Without it the query fails with a CastError and every link shows the
// 500 page.
const findUserByResetToken = (token) => User.findOne({
    resetPasswordToken: hashToken(token),
    resetPasswordExpires: mongoose.trusted({ $gt: Date.now() }),
})

// Shown for a link that is unknown, already used, or older than an hour
const LINK_EXPIRED = 'Password reset token is invalid or has expired.'

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
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                req.flash('errors', errors.array())
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            // Normalised by validateForgot. An address typed with different
            // capitalisation would otherwise find nothing, and reset would
            // silently fail.
            const { email } = matchedData(req)

            // The reset link is built from BASE_URL only. The Host header comes from
            // the client, so a link built from it could point at someone else's
            // server and hand them the token. Without BASE_URL no email is sent.
            if (!process.env.BASE_URL) {
                return next(new Error('BASE_URL is not set, so password reset links cannot be built.'))
            }

            const user = await User.findOne({ email })

            // Everything below runs only for a real account, but the response is
            // the same either way — see the flash at the end of this function.
            if (user) {
                // Generate a secure random token
                const buf = await new Promise((resolve, reject) => {
                    crypto.randomBytes(20, (err, buf) => {
                        if (err) return reject(err)
                        resolve(buf)
                    })
                })
                const token = buf.toString('hex')

                // new URL() also copes with a trailing slash on BASE_URL
                const resetUrl = new URL(`/reset/${token}`, process.env.BASE_URL).href

                user.resetPasswordToken = hashToken(token)
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
                                        <a href="${resetUrl}">${resetUrl}</a>
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
            }

            // Identical response whether or not the account exists, so this form
            // can't be used to discover which addresses are registered.
            req.flash('info', [{ msg: `If an account exists for ${email}, a reset link has been sent. It expires in 1 hour.` }])
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
            // Check the link before showing the form, so nobody types a new
            // password only to learn the link had already expired
            const user = await findUserByResetToken(req.params.token)
            if (!user) {
                req.flash('errors', [{ msg: LINK_EXPIRED }])
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            res.render('recover.ejs', { token: req.params.token })
        } catch(err) {
            next(err)
        }
    },

    postRecoverPassword: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                req.flash('errors', errors.array())
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    // Express 5 removed res.redirect('back')
                    // Send user back to their own reset URL.
                    // The token is encoded so it can't escape the /reset/ path.
                    res.redirect(`/reset/${encodeURIComponent(req.params.token)}`)
                })
            }

            const { password } = matchedData(req)
            const user = await findUserByResetToken(req.params.token)

            if (!user) {
                req.flash('errors', [{ msg: LINK_EXPIRED }])
                return req.session.save((err) => {
                    if (err) { return next(err) }
                    res.redirect('/forgot')
                })
            }

            // Set new password and clear token fields
            user.password = password
            user.resetPasswordToken = undefined
            user.resetPasswordExpires = undefined
            // Signs the account out on every other device (see endStaleSessions)
            user.passwordChangedAt = new Date()
            await user.save()

            // Log the user in automatically after reset
            req.login(user, function(err) {
                if (err) { return next(err) }
                markLoginTime(req)
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
