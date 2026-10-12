/**************************************************************
 * utils.js - client-side javascript functions extracted from main.js (/public/js/main.js)
 * Tested with jest (/test/unit/clientSideJS.test.js). They stay pure,
 * with no DOM access, so the browser and Jest run the same code.
 **************************************************************/

/**************************************************************
 * FIELD_LIMITS
 * The longest value the server accepts for each text field
 * (validateInspection in middleware/validators.js). The modal's
 * maxlength attributes hold the same numbers.
 **************************************************************/
const FIELD_LIMITS = {
    truckTractorNo: 30,
    trailerNo: 60,
    remarks: 2000,
    mechanicDate: 20,
    driverDate: 20,
};

/**************************************************************
 * sanitizeText()
 * Cleans one text field: trims it, and turns anything that isn't
 * a string into ''. Characters are kept exactly as typed, so
 * "Driver's side" stays "Driver's side". Nothing typed here can
 * run as code: jsPDF draws plain text, and the dashboard escapes
 * every value with <%= %>.
 * Parameters: string — the value to clean
 * Returns: a trimmed string, or '' if input is not a string
 **************************************************************/
function sanitizeText(string) {
    if (typeof string !== 'string') {
        return '';
    }
    return string.trim();
}

/**************************************************************
 * validateAndSanitize()
 * Cleans every text field on an inspection object and cuts each
 * one to the server's limit.
 * Returns null if truckTractorNo is empty after cleaning.
 * Parameters: userInspectionObject — raw object from readFormData()
 * Returns: a new cleaned object, or null if truck number is missing
 **************************************************************/
function validateAndSanitize(userInspectionObject) {
    const truckNo = sanitizeText(userInspectionObject.truckTractorNo);

    if (!truckNo) {
        return null;
    }

    const cleaned = { ...userInspectionObject };
    Object.entries(FIELD_LIMITS).forEach(([field, maxLength]) => {
        cleaned[field] = sanitizeText(userInspectionObject[field]).slice(0, maxLength);
    });
    return cleaned;
}

/**************************************************************
 * decodeHTMLEntities()
 * Turns HTML entities back into the characters they stand for.
 * Inspections saved between June 2025 and January 2026 went
 * through express-validator's escape(), so a stored remark can
 * read "Driver&#x27;s side". Only entities change: anything that
 * looks like a tag stays as typed text, so "check <brake lines>"
 * comes back unchanged.
 * Parameters: text — a string that may contain HTML entities
 * Returns: the decoded string ('' if input is not a string)
 **************************************************************/
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeHTMLEntities(text) {
    if (typeof text !== 'string') {
        return '';
    }
    // Matches &#x27; (hex), &#39; (decimal) and &amp;-style named entities
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, code) => {
        if (code[0] !== '#') {
            const named = NAMED_ENTITIES[code.toLowerCase()];
            return named === undefined ? entity : named;
        }
        const isHex = code[1] === 'x' || code[1] === 'X';
        const codePoint = parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    });
}

/**************************************************************
 * pdfFileName()
 * Builds the download name for an inspection PDF from its truck
 * number and date, for example pretriq-TRK-100-2026-10-11.pdf.
 * Parameters: truckNo — the truck / tractor number
 *             date — a Date (the inspection's local calendar day);
 *                    today is used if it's missing or invalid
 * Returns: a file name that is safe on every operating system
 **************************************************************/
function pdfFileName(truckNo, when) {
    const date = when instanceof Date && !Number.isNaN(when.getTime()) ? when : new Date();
    // Anything other than letters, digits and dashes becomes a dash
    const truck = sanitizeText(String(truckNo || '')).replace(/[^A-Za-z0-9-]+/g, '-').slice(0, 30) || 'inspection';
    const day = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return `pretriq-${truck}-${day}.pdf`;
}

/**************************************************************
 * This file is loaded two ways: by the browser as a plain script
 * and by Jest as a CommonJS module. The guard keeps the browser from throwing
 * "module is not defined" on the export below.
 **************************************************************/
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FIELD_LIMITS, sanitizeText, validateAndSanitize, decodeHTMLEntities, pdfFileName };
}
