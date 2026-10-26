/**************************************************************
 * signOff.js
 * Where a saved report stands in the sign-offs that follow it:
 * the mechanic's repair certification (49 CFR 396.11(a)(3)) and
 * the next driver's acknowledgment (396.13). The dashboard's
 * sign-off routes (controllers/inspection.js) use it to keep the
 * steps in order.
 *
 *   'none'          no defects, so there's nothing to sign off
 *   'open'          defects listed, no repair certification yet
 *   'certified'     repairs certified (or found unnecessary); the
 *                   mechanic's part can still be cleared and redone
 *   'acknowledged'  the next driver has signed; the report is final
 *
 * A certification ticked on the form when the report was saved
 * counts too, so older reports pick up where they left off. Pass
 * a plain object (a .lean() document): Object.values() on a
 * Mongoose subdocument doesn't list its fields.
 **************************************************************/
const { hasDefects } = require('../public/js/utils')

const signOffStatus = (inspection) => {
    if (!hasDefects(inspection)) {
        return 'none'
    }
    if (inspection.acknowledgedAt) {
        return 'acknowledged'
    }
    if (inspection.defectsCorrected || inspection.defectsNotCorrected) {
        return 'certified'
    }
    return 'open'
}

module.exports = { signOffStatus }
