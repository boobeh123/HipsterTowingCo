const { once } = require('events')
const { matchedData, validationResult } = require('express-validator')
const Inspection = require('../models/Inspection')
const Counter = require('../models/Counter')
const { buildInspectionFilter } = require('../utils/inspectionFilter')
const { CSV_HEADER, inspectionRow, exportFileName } = require('../utils/inspectionCsv')

const INSPECTIONS_PER_PAGE = 10

// The filter fields the form sends, in the order they appear in its URLs
const FILTER_FIELDS = ['q', 'from', 'to', 'status', 'tz']

// The fields the CSV export reads
const EXPORT_FIELDS = 'createdAt date truckTractorNo trailerNo conditionSatisfactory defects remarks defectsCorrected defectsNotCorrected mechanicDate driverDate'

// The filter values validateDashboardQuery (middleware/validators.js) has
// checked. matchedData() keeps only the ones that passed, so a bad value is
// ignored rather than breaking the page or the export.
const readFilters = (query) => ({
    q: query.q || '',
    from: query.from || '',
    to: query.to || '',
    status: query.status || '',
    tz: query.tz,
})

// A dashboard URL (one page of the history, or the export) keeping the active filters
const dashboardUrl = (filters, page, path = '/dashboard') => {
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
    return queryString ? `${path}?${queryString}` : path
}

module.exports = {

    getDashboard: async (req, res, next) => {
        try {
            const userId = req.user._id

            const query = matchedData(req, { locations: ['query'] })
            const filtersIgnored = !validationResult(req).isEmpty()
            const filters = readFilters(query)
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
                exportUrl: dashboardUrl(filters, 1, '/dashboard/export'),
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

    /**************************************************************
     * exportCsv()
     * Downloads the inspections the dashboard is showing (the same
     * filters, newest first) as a CSV file. Rows are streamed from a
     * cursor, so a long history never sits in memory all at once.
     **************************************************************/
    exportCsv: async (req, res, next) => {
        const filters = readFilters(matchedData(req, { locations: ['query'] }))
        const filter = buildInspectionFilter(req.user._id, filters)

        try {
            const cursor = Inspection.find(filter)
                .sort({ createdAt: -1 })
                .select(EXPORT_FIELDS)
                .lean()
                .cursor()

            res.set({
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${exportFileName(filters.tz)}"`,
                // The file holds private inspection details
                'Cache-Control': 'no-store',
            })
            // The byte order mark tells Excel the file is UTF-8
            res.write(`\uFEFF${CSV_HEADER}`)

            for await (const inspection of cursor) {
                if (!res.write(inspectionRow(inspection, filters.tz))) {
                    // Wait for the connection to catch up instead of buffering
                    // the rest, and stop if the browser has gone away
                    await Promise.race([once(res, 'drain'), once(res, 'close')])
                    if (res.destroyed) break
                }
            }
            res.end()
        } catch(err) {
            if (!res.headersSent) {
                return next(err)
            }
            // Part of the file has gone out: cut the download off so a short
            // file can't be mistaken for a complete one
            res.destroy(err)
        }
    },

}
