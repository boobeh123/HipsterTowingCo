const { body, query, validationResult } = require('express-validator')
const { FILTER_STATUSES } = require('../utils/inspectionFilter')

/**************************************************************
 * validators.js
 * One express-validator chain per form, plus one for the JSON
 * inspection save. A route runs the chain before its controller.
 * The controller checks the result with formErrors(), then reads
 * the cleaned-up input with matchedData(), never req.body.
 *
 * Every text field starts with .isString(), so an object or a
 * list can't arrive where text belongs, and a missing field
 * becomes a message instead of a 500 page. The messages are the
 * ones the forms already showed.
 **************************************************************/

/**************************************************************
 * formErrors
 * validationResult, keeping only each error's message.
 * express-validator's default error objects also carry what was
 * typed, so flashing them would store passwords in the session
 * database until the next page showed the message.
 **************************************************************/
const formErrors = validationResult.withDefaults({
    formatter: (error) => ({ msg: error.msg }),
})

// The same email clean-up the app has always used, so existing accounts
// still match: lowercased, with +tags removed for Gmail and similar
// providers, but the dots in Gmail addresses kept.
const emailField = () =>
    body('email')
        .isString().withMessage('Please enter a valid email address.').bail()
        .trim()
        .isEmail().withMessage('Please enter a valid email address.').bail()
        .normalizeEmail({ gmail_remove_dots: false })

// Signup and the reset form share the new-password rules
const newPasswordFields = () => [
    body('password')
        .isString().withMessage('Password must be at least 8 characters long.').bail()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
    body('confirmPassword')
        .isString().withMessage('Passwords do not match.').bail()
        .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
]

// The name set during onboarding and changed on the profile page
const nameField = (missingMessage) =>
    body('name')
        .isString().withMessage(missingMessage).bail()
        .trim()
        .notEmpty().withMessage(missingMessage).bail()
        .isLength({ max: 60 }).withMessage('Name must be between 1 and 60 characters.')

// Optional text on the inspection form: empty is fine, too long is not
const optionalText = (field, maxLength, label) =>
    body(field)
        .optional()
        .isString().withMessage(`${label} must be text.`).bail()
        .trim()
        .isLength({ max: maxLength }).withMessage(`${label} can be up to ${maxLength} characters.`)

// Ticked checkboxes arrive as true or "true", unticked ones are missing
const checkbox = (field) =>
    body(field)
        .optional()
        .isBoolean().withMessage('Checkbox values must be true or false.').bail()
        .toBoolean(true)

const TERMS_MESSAGE = 'Please agree to the Terms of Use to create an account.'

module.exports = {
    formErrors,

    // No length rule on the password: accounts created before the
    // 8-character minimum still have shorter ones. Passport decides.
    validateLogin: [
        emailField(),
        body('password')
            .isString().withMessage('Please enter your password.').bail()
            .notEmpty().withMessage('Please enter your password.'),
    ],

    validateSignup: [
        emailField(),
        ...newPasswordFields(),
        // A ticked checkbox with no value attribute sends "on"
        body('terms')
            .isString().withMessage(TERMS_MESSAGE).bail()
            .equals('on').withMessage(TERMS_MESSAGE),
    ],

    validateForgot: [
        emailField(),
    ],

    validateReset: newPasswordFields(),

    validateOnboard: [
        nameField('Please enter your name to continue.'),
    ],

    validateProfileName: [
        nameField('Please enter your name.'),
    ],

    // The profile page's change-password form. The controller checks the
    // current password against the account before changing anything.
    validateProfilePassword: [
        body('currentPassword')
            .isString().withMessage('Please enter your current password.').bail()
            .notEmpty().withMessage('Please enter your current password.'),
        ...newPasswordFields(),
    ],

    // The dashboard's filter form, sent as a GET query. Empty fields are
    // skipped. A value that doesn't fit is left out of matchedData(), and the
    // controller tells the page some filters were ignored.
    validateDashboardQuery: [
        query('q').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 60 }),
        query('from').optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true }),
        query('to').optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true }),
        query('status').optional({ values: 'falsy' }).isIn(FILTER_STATUSES),
        // The browser's getTimezoneOffset(): -840 (UTC+14) to 720 (UTC-12)
        query('tz').optional({ values: 'falsy' }).isInt({ min: -840, max: 840 }).toInt(),
        query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
    ],

    // The JSON body that public/js/main.js posts after building the PDF.
    // matchedData() keeps only these fields, so a client can't set
    // createdAt, _id or anything else the schema holds.
    validateInspection: [
        body('truckTractorNo')
            .isString().withMessage('Truck / Tractor No. is required.').bail()
            .trim()
            .notEmpty().withMessage('Truck / Tractor No. is required.').bail()
            .isLength({ max: 30 }).withMessage('Truck / Tractor No. can be up to 30 characters.'),
        optionalText('trailerNo', 60, 'Trailer No(s).'),
        optionalText('date', 20, 'Date'),
        optionalText('remarks', 2000, 'Remarks'),
        optionalText('mechanicDate', 20, "The mechanic's date"),
        optionalText('driverDate', 20, "The driver's date"),
        checkbox('conditionSatisfactory'),
        checkbox('defectsCorrected'),
        checkbox('defectsNotCorrected'),
        // Unknown defect names pass through here, and the schema drops them
        checkbox('defects.truckTractor.*'),
        checkbox('defects.trailer.*'),
    ],
}
