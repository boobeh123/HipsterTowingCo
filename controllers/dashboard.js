const { matchedData, validationResult } = require('express-validator')
const Inspection = require('../models/Inspection')
const Counter = require('../models/Counter')
const { buildInspectionFilter } = require('../utils/inspectionFilter')

const INSPECTIONS_PER_PAGE = 10

// The filter fields the form sends, in the order they appear in its URLs
const FILTER_FIELDS = ['q', 'from', 'to', 'status', 'tz']

// A dashboard URL for one page of the history, keeping the active filters
const dashboardUrl = (filters, page) => {
    const params = new URLSearchParams()
    FILTER_FIELDS.forEach((field) => {
        if (filters[field] !== undefined && filters[field] !== '') {
            params.set(field, filters[field])
        }
    })
    if (page > 1) {
        params.set('page', page)
    }
    const queryString = params.toString()
    return queryString ? `/dashboard?${queryString}` : '/dashboard'
}

module.exports = {

    getDashboard: async (req, res, next) => {
        try {
            const userId = req.user._id

            // validateDashboardQuery (middleware/validators.js) has checked the
            // query. matchedData() keeps only the values that passed, so a bad
            // value is ignored rather than breaking the page.
            const query = matchedData(req, { locations: ['query'] })
            const filtersIgnored = !validationResult(req).isEmpty()
            const filters = {
                q: query.q || '',
                from: query.from || '',
                to: query.to || '',
                status: query.status || '',
                tz: query.tz,
            }
            const filtersActive = Boolean(filters.q || filters.from || filters.to || filters.status)
            const filter = buildInspectionFilter(userId, filters)

            // The stats cover all of the user's inspections; the history below
            // them follows the filters. inspectionCount feeds the global counter
            // in inspectionModal.ejs, which dashboard.ejs includes.
            const [
                counter,
                totalInspections,
                mostRecent,
                matchingInspections,
            ] = await Promise.all([
                Counter.findOne({ name: 'inspectionCount' }),
                Inspection.countDocuments({ userId }),
                Inspection.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .select('date createdAt')
                    .lean(),
                filtersActive ? Inspection.countDocuments(filter) : null,
            ])

            const matching = filtersActive ? matchingInspections : totalInspections
            const totalPages = Math.ceil(matching / INSPECTIONS_PER_PAGE)
            // A page past the end shows the last page instead of an empty table
            const page = Math.max(1, Math.min(query.page || 1, totalPages))

            const inspections = await Inspection.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * INSPECTIONS_PER_PAGE)
                .limit(INSPECTIONS_PER_PAGE)
                .select('truckTractorNo trailerNo date createdAt conditionSatisfactory')
                .lean()

            res.render('dashboard.ejs', {
                inspections,
                totalInspections,
                lastInspectionDate: mostRecent ? (mostRecent.date || mostRecent.createdAt) : null,
                currentPage: page,
                totalPages,
                prevUrl: page > 1 ? dashboardUrl(filters, page - 1) : null,
                nextUrl: page < totalPages ? dashboardUrl(filters, page + 1) : null,
                filters,
                filtersActive,
                filtersIgnored,
                matchingInspections: matching,
                inspectionCount: counter ? counter.value : 0,
            })
        } catch(err) {
            next(err)
        }
    },

}
