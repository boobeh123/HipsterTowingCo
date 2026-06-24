const Inspection = require('../models/Inspection')

module.exports = {

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

}
