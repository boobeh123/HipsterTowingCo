const { decodeHTMLEntities } = require('../public/js/utils')
const { labelsFor } = require('./dvirChecklist')

/**************************************************************
 * inspectionCsv.js
 * Builds the dashboard's CSV export, one row per inspection. Pure:
 * exportCsv in controllers/dashboard.js streams the rows. Written
 * for Excel and Google Sheets: every cell quoted, CRLF line ends
 * (RFC 4180), and the controller starts the file with a UTF-8 byte
 * order mark so Excel reads accents and "–" correctly.
 **************************************************************/

// The checklist's labels, keyed like the schema in models/Inspection.js and
// in the paper form's order. They live in utils/dvirChecklist.js, which the
// inspection form uses too. A defects cell lists the ticked ones.
const DEFECT_LABELS = {
    truckTractor: labelsFor('truckTractor'),
    trailer: labelsFor('trailer'),
}

const CSV_COLUMNS = [
    'Saved',
    'Inspection date',
    'Truck / Tractor No.',
    'Trailer No(s).',
    'Condition',
    'Truck / tractor defects',
    'Trailer defects',
    'Remarks',
    'Defects corrected',
    'Defects need not be corrected',
    "Mechanic's date",
    "Driver's date",
]

// A spreadsheet treats a cell starting with one of these as a formula
const FORMULA_STARTS = ['=', '+', '-', '@', '\t', '\r']

/**************************************************************
 * csvCell()
 * One quoted CSV cell. Old inspections can hold HTML entities
 * (see decodeHTMLEntities in public/js/utils.js), so they are
 * decoded. A cell that starts like a formula gets a leading ' so a
 * spreadsheet shows it as text instead of running it (CSV
 * injection, as OWASP describes it).
 **************************************************************/
const csvCell = (value) => {
    let text = value === undefined || value === null ? '' : decodeHTMLEntities(String(value))
    if (FORMULA_STARTS.some((start) => text.startsWith(start))) {
        text = `'${text}`
    }
    // Quotes inside a quoted cell are doubled; commas and line breaks are then safe
    return `"${text.split('"').join('""')}"`
}

const csvRow = (cells) => `${cells.map(csvCell).join(',')}\r\n`

const CSV_HEADER = csvRow(CSV_COLUMNS)

/**************************************************************
 * localDateTime()
 * "2026-10-10 21:00" in the driver's time zone. tz is the
 * browser's getTimezoneOffset(), as in utils/inspectionFilter.js.
 **************************************************************/
const localDateTime = (date, tz = 0) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return ''
    }
    return new Date(date.getTime() - tz * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}

// The labels of the ticked items in one checklist section
const defectList = (section, labels) => Object.keys(labels)
    .filter((key) => section && section[key] === true)
    .map((key) => labels[key])
    .join('; ')

const yesOrBlank = (flag) => (flag === true ? 'Yes' : '')

/**************************************************************
 * inspectionRow()
 * One inspection (a lean document) as a CSV line, in CSV_COLUMNS
 * order. "Defects noted" covers anything not marked satisfactory,
 * as on the dashboard.
 **************************************************************/
const inspectionRow = (inspection, tz = 0) => {
    const defects = inspection.defects || {}
    return csvRow([
        localDateTime(inspection.createdAt, tz),
        inspection.date,
        inspection.truckTractorNo,
        inspection.trailerNo,
        inspection.conditionSatisfactory === true ? 'Satisfactory' : 'Defects noted',
        defectList(defects.truckTractor, DEFECT_LABELS.truckTractor),
        defectList(defects.trailer, DEFECT_LABELS.trailer),
        inspection.remarks,
        yesOrBlank(inspection.defectsCorrected),
        yesOrBlank(inspection.defectsNotCorrected),
        inspection.mechanicDate,
        inspection.driverDate,
    ])
}

// pretriq-inspections-2026-10-12.csv, dated by the driver's calendar day
const exportFileName = (tz = 0, now = new Date()) => `pretriq-inspections-${localDateTime(now, tz).slice(0, 10)}.csv`

module.exports = { DEFECT_LABELS, CSV_COLUMNS, CSV_HEADER, csvCell, csvRow, localDateTime, inspectionRow, exportFileName }
