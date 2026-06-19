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
            next(err)
        }
    },

}
