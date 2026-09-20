const Inspection = require('../models/Inspection')
const Counter = require('../models/Counter')

const INSPECTIONS_PER_PAGE = 10

module.exports = {

    getDashboard: async (req, res, next) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1)
            const userId = req.user._id

            // inspectionCount feeds the global counter in inspectionModal.ejs,
            // which dashboard.ejs includes. It used to be awaited on its own
            // line ahead of these; running it here makes it parallel instead.
            const [
                counter,
                totalInspections,
                mostRecent,
                inspections,
            ] = await Promise.all([
                Counter.findOne({ name: 'inspectionCount' }),
                Inspection.countDocuments({ userId }),
                Inspection.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .select('date createdAt')
                    .lean(),
                Inspection.find({ userId })
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * INSPECTIONS_PER_PAGE)
                    .limit(INSPECTIONS_PER_PAGE)
                    .select('truckTractorNo trailerNo date createdAt conditionSatisfactory')
                    .lean(),
            ])

            const totalPages = Math.ceil(totalInspections / INSPECTIONS_PER_PAGE)

            res.render('dashboard.ejs', {
                inspections,
                totalInspections,
                lastInspectionDate: mostRecent ? (mostRecent.date || mostRecent.createdAt) : null,
                currentPage: page,
                totalPages,
                inspectionCount: counter ? counter.value : 0,
            })
        } catch(err) {
            next(err)
        }
    },

}
