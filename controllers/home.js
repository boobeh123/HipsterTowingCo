const Counter = require('../models/Counter')

module.exports = {

    getIndex: async (req, res, next) => {
        try {
            const counter = await Counter.findOne({ name: 'inspectionCount' })
            const inspectionCount = counter ? counter.value : 0
            res.render('index.ejs', { inspectionCount })
        } catch(err) {
            next(err)
        }
    },

    /**************************************************************
    * postInspectionCount()
    * Increments the inspectionCount counter by +1 after a PDF is successfully generated
    **************************************************************/
    postInspectionCount: async (req, res, next) => {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: 'inspectionCount' },
                { $inc: { value: 1 } },
                { new: true, upsert: true }
            )
            res.json({ count: counter.value })
        } catch(err) {
            next(err)
        }
    },

}
