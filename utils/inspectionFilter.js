const mongoose = require('mongoose')

/**************************************************************
 * inspectionFilter.js
 * Turns the dashboard's filter values (already checked by
 * validateDashboardQuery in middleware/validators.js) into a
 * MongoDB filter for one user's inspections. Pure, so the
 * dashboard and the CSV export can share it.
 *
 * sanitizeFilter is on (config/database.js), so every operator
 * written here is wrapped in mongoose.trusted(). Without it, the
 * $expr would be refused outright and the date range would fail
 * to cast.
 **************************************************************/

const DAY_MS = 24 * 60 * 60 * 1000

// The condition filter's values: "defects" or "ok" (satisfactory)
const FILTER_STATUSES = ['defects', 'ok']

/**************************************************************
 * localDayStart()
 * The moment a calendar day starts in the browser's time zone.
 * tz is the browser's Date.getTimezoneOffset(): minutes to add
 * to local time to get UTC, so Hawaii is 600 and Japan is -540.
 **************************************************************/
const localDayStart = (ymd, tz = 0) => {
    const [year, month, day] = ymd.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day) + tz * 60 * 1000)
}

// True when the field contains the search term, ignoring case. $literal
// keeps a term that starts with "$" from being read as a field name.
const fieldContains = (field, term) => ({
    $gte: [{ $indexOfCP: [{ $toLower: field }, { $literal: term.toLowerCase() }] }, 0],
})

/**************************************************************
 * buildInspectionFilter()
 * Parameters: userId — the signed-in user's _id
 *             filters — { q, from, to, status, tz }, any of them
 *             missing:
 *               q: text the truck number, trailer number or
 *                  remarks contain
 *               from, to: YYYY-MM-DD local days (inclusive)
 *               status: 'defects' or 'ok'
 *               tz: the browser's time zone offset in minutes
 * Returns: a filter for Inspection.find() / countDocuments()
 **************************************************************/
const buildInspectionFilter = (userId, filters = {}) => {
    const { q, status, tz = 0 } = filters
    let { from, to } = filters
    const filter = { userId }

    // A plain contains-match without a regex built from user input. Remarks
    // saved between June 2025 and January 2026 hold HTML entities
    // (Driver&#x27;s), so a search with an apostrophe or quote misses those.
    if (q) {
        filter.$expr = mongoose.trusted({
            $or: [
                fieldContains('$truckTractorNo', q),
                fieldContains('$trailerNo', q),
                fieldContains('$remarks', q),
            ],
        })
    }

    // The days are inclusive: "to" runs until the next local midnight
    if (from && to && from > to) {
        [from, to] = [to, from]
    }
    if (from || to) {
        const range = {}
        if (from) range.$gte = localDayStart(from, tz)
        if (to) range.$lt = new Date(localDayStart(to, tz).getTime() + DAY_MS)
        filter.createdAt = mongoose.trusted(range)
    }

    // "Defects noted" is anything not marked satisfactory, which includes
    // old inspections saved before the field existed, matching the badge
    if (status === 'ok') {
        filter.conditionSatisfactory = true
    } else if (status === 'defects') {
        filter.conditionSatisfactory = mongoose.trusted({ $ne: true })
    }

    return filter
}

module.exports = { FILTER_STATUSES, localDayStart, buildInspectionFilter }
