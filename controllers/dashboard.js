const Inspection = require('../models/Inspection')
const Counter = require('../models/Counter')

const INSPECTIONS_PER_PAGE = 10

module.exports = {

    getDashboard: async (req, res, next) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1)
            const userId = req.user._id
            const counter = await Counter.findOne({ name: 'inspectionCount' })
            const inspectionCount = counter ? counter.value : 0

            const [
                totalInspections,
                inspectionsWithDefects,
                mostRecent,
                inspections,
            ] = await Promise.all([
                Inspection.countDocuments({ userId }),
                Inspection.countDocuments({
                    userId,
                    $or: [
                        { 'defects.truckTractor.airCompressor': true },
                        { 'defects.truckTractor.brakes': true },
                        { 'defects.truckTractor.engine': true },
                        { 'defects.truckTractor.steering': true },
                        { 'defects.truckTractor.tires': true },
                        { 'defects.trailer.brakes': true },
                        { 'defects.trailer.tires': true },
                        { conditionSatisfactory: false },
                    ]
                }),
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
                inspectionsWithDefects,
                lastInspectionDate: mostRecent ? (mostRecent.date || mostRecent.createdAt) : null,
                currentPage: page,
                totalPages,
                inspectionCount,
            })
        } catch(err) {
            next(err)
        }
    },

}
