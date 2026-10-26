const { matchedData } = require('express-validator')
const Inspection = require('../models/Inspection')
const { formErrors } = require('../middleware/validators')
const { signOffStatus } = require('../utils/signOff')

/**************************************************************
 * Repair sign-offs
 * After a driver saves a report that lists defects, the dashboard
 * adds the mechanic's certification, then the next driver's
 * acknowledgment (utils/signOff.js has the steps). Only those
 * fields change: the driver's own part stays as it was saved. The
 * mechanic's part can be cleared and redone until the next driver
 * signs; after that the report is final.
 *
 * Each handler loads the report as this user's (another user's
 * id looks the same as a missing one), checks the step is allowed,
 * then updates with acknowledgedAt: null in the filter, so a report
 * that became final in the meantime is left alone. Answers are
 * JSON, for the dashboard's fetch().
 **************************************************************/
const NOT_ALLOWED = {
    none: 'This report lists no defects, so there are no repairs to sign off.',
    open: 'The mechanic has to certify the repairs before the next driver signs.',
    acknowledged: "The next driver has signed this report, so it can't be changed.",
}

const findOwnReport = (req) => Inspection.findOne({ _id: req.params.id, userId: req.user._id }).lean()

const notFound = (res) => res.status(404).json({ error: 'Inspection not found.' })

const notAllowed = (res, status) => res.status(409).json({ error: NOT_ALLOWED[status] })

// A malformed id is a bad address, like getInspection; a schema limit is a 400
const signOffError = (err, res, next) => {
    if (err.name === 'CastError') {
        return notFound(res)
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Validation failed.' })
    }
    next(err)
}

module.exports = {

    getInspection: async (req, res, next) => {
        try {
            const inspection = await Inspection.findOne({
                _id: req.params.id,
                userId: req.user._id,
            }).lean()

            if (!inspection) {
                return res.status(404).json({ error: 'Inspection not found.' })
            }

            res.json(inspection)
        } catch(err) {
            // A malformed id in the URL makes Mongoose throw a CastError before it queries. 
            if (err.name === 'CastError') {
                return res.status(404).json({ error: 'Inspection not found.' })
            }
            next(err)
        }
    },

    postInspection: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg })
            }

            // Only the fields validateInspection checked. Spreading req.body let
            // a client set createdAt, _id or the old signature fields.
            const inspection = new Inspection({
                ...matchedData(req),
                userId: req.user._id,
            })
            await inspection.save()
            res.status(201).json({ success: true, id: inspection._id })
        } catch(err) {
            if (err.name === 'ValidationError') {
                const message = Object.values(err.errors)[0]?.message || 'Validation failed.'
                return res.status(400).json({ error: message })
            }
            next(err)
        }
    },

    deleteInspection: async (req, res, next) => {
        try {
            const inspection = await Inspection.findOneAndDelete({
                _id: req.params.id,
                userId: req.user._id,
            })

            if (!inspection) {
                req.flash('errors', [{ msg: 'Inspection not found.' }])
                return req.session.save((err) => {
                    if (err) return next(err)
                    res.redirect('/dashboard')
                })
            }

            req.flash('success', 'Inspection deleted.')
            req.session.save((err) => {
                if (err) return next(err)
                res.redirect('/dashboard')
            })
        } catch(err) {
            // As above: a malformed id is a bad address, so it gets the same
            // flash and redirect as an inspection that simply isn't there.
            if (err.name === 'CastError') {
                req.flash('errors', [{ msg: 'Inspection not found.' }])
                return req.session.save((saveErr) => {
                    if (saveErr) return next(saveErr)
                    res.redirect('/dashboard')
                })
            }
            next(err)
        }
    },

    // PUT /inspections/:id/certification: save (or redo) the mechanic's part
    putCertification: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg })
            }

            const report = await findOwnReport(req)
            if (!report) {
                return notFound(res)
            }
            const status = signOffStatus(report)
            if (status === 'none' || status === 'acknowledged') {
                return notAllowed(res, status)
            }

            const { outcome, mechanicSignature, mechanicDate } = matchedData(req)
            const result = await Inspection.updateOne(
                { _id: report._id, userId: req.user._id, acknowledgedAt: null },
                { $set: {
                    defectsCorrected: outcome === 'corrected',
                    defectsNotCorrected: outcome === 'notNeeded',
                    mechanicSignature,
                    mechanicDate,
                    repairCertifiedAt: new Date(),
                } },
                { runValidators: true },
            )
            if (result.matchedCount === 0) {
                return notAllowed(res, 'acknowledged')
            }
            res.json({ status: 'certified' })
        } catch(err) {
            signOffError(err, res, next)
        }
    },

    // DELETE /inspections/:id/certification: clear the mechanic's part, until
    // the next driver signs
    deleteCertification: async (req, res, next) => {
        try {
            const report = await findOwnReport(req)
            if (!report) {
                return notFound(res)
            }
            const status = signOffStatus(report)
            if (status === 'none' || status === 'acknowledged') {
                return notAllowed(res, status)
            }

            const result = await Inspection.updateOne(
                { _id: report._id, userId: req.user._id, acknowledgedAt: null },
                {
                    $set: { defectsCorrected: false, defectsNotCorrected: false },
                    $unset: { mechanicSignature: '', mechanicDate: '', repairCertifiedAt: '' },
                },
            )
            if (result.matchedCount === 0) {
                return notAllowed(res, 'acknowledged')
            }
            res.json({ status: 'open' })
        } catch(err) {
            signOffError(err, res, next)
        }
    },

    // PUT /inspections/:id/acknowledgment: the next driver signs a certified
    // report, which makes it final
    putAcknowledgment: async (req, res, next) => {
        try {
            const errors = formErrors(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg })
            }

            const report = await findOwnReport(req)
            if (!report) {
                return notFound(res)
            }
            const status = signOffStatus(report)
            if (status !== 'certified') {
                return notAllowed(res, status)
            }

            const { nextDriverSignature, driverDate } = matchedData(req)
            const result = await Inspection.updateOne(
                { _id: report._id, userId: req.user._id, acknowledgedAt: null },
                { $set: { nextDriverSignature, driverDate, acknowledgedAt: new Date() } },
                { runValidators: true },
            )
            if (result.matchedCount === 0) {
                return notAllowed(res, 'acknowledged')
            }
            res.json({ status: 'acknowledged' })
        } catch(err) {
            signOffError(err, res, next)
        }
    },

}
