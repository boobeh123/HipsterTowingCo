const Inspection = require('../models/Inspection')

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
            next(err)
        }
    },

    postInspection: async (req, res, next) => {
        try {
            const inspection = new Inspection({
                ...req.body,
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
            next(err)
        }
    },

}
