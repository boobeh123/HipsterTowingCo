const overlay = document.querySelector('#inspectionOverlay');
const form = document.querySelector('#inspectionForm');
const resultOverlay = document.querySelector('#result-overlay');
const downloadPdfBtn = document.querySelector('#downloadPdfBtn');
const viewPdfBtn = document.querySelector('#viewPdfBtn');
const closeResultBtn = document.querySelector('#closeResultBtn');
const saveStatus = document.querySelector('#saveStatus');
const filterTz = document.querySelector('#filter-tz');
const exportLink = document.querySelector('.dashboard__exportBtn');
const signaturePadElements = document.querySelectorAll('.inspection-sig-pad');

// Holds the most recently generated jsPDF doc, and the data it was built
// from, so the download button can save it under a meaningful file name
let currentInspectionReport = null;
let currentInspectionData = null;

// The button that opened the inspection modal. Focus goes back to it when
// the modal and the result popup close, so keyboard and screen reader users
// don't lose their place.
let modalOpener = null;

// Set after a signed-in save succeeds on the dashboard, so closing the
// result popup reloads the page and the new report shows in the history
let reloadOnResultClose = false;

// The modal's signature pads, keyed by the inspection field each one fills
const signaturePads = new Map();

// Every fetch here talks JSON; errorHandler.js answers in JSON when asked to
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

/**************************************************************
 * Google Analytics — dynamic consent injection
 * GA is never loaded on page load. injectGA() is called only
 * after the user explicitly accepts via the consent banner,
 * or on return visits where consent was already granted.
 * Guards against double-injection with a src check.
 **************************************************************/
function injectGA() {
    // Reset pages carry a live token in the URL, and GA's page_view would send
    // that whole URL to Google. Analytics resumes on the next page.
    if (window.location.pathname.startsWith('/reset/')) return
    if (document.querySelector('script[src*="googletagmanager"]')) return
    window.dataLayer = window.dataLayer || []
    window.gtag = function() { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', 'G-DHM2VXYJYE')
    const gaScript = document.createElement('script')
    gaScript.async = true
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-DHM2VXYJYE'
    document.head.appendChild(gaScript)
}

// Returning visitors: inject GA immediately if already consented (no banner needed)
const gaConsent = localStorage.getItem('pretriq_ga_consent')
if (gaConsent === 'granted') {
    injectGA()
}

function openModal(event) {
    if (!overlay) return;

    // The clicked button itself: Safari doesn't focus buttons on click, so
    // document.activeElement would often be the page body
    modalOpener = (event && event.currentTarget) || document.activeElement;
    const dateField = document.querySelector('#date');
    const truckTractorNoInputField = document.querySelector('#truckTractorNo');

    if (dateField) {
        const todaysDate = new Date();
        dateField.value = `${todaysDate.getMonth() + 1}/${todaysDate.getDate()}/${todaysDate.getFullYear()}`; // Month/Day/Year
    }

    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    document.body.classList.add('has-modal-open');
    updateRepairSection();
    // The pads only have a size once the modal shows. The mechanic's stays
    // hidden until a defect is ticked, and updateRepairSection() sizes it then
    signaturePads.forEach((pad) => pad.resize());

    clearModalFlash();
    
    if (truckTractorNoInputField) {
        truckTractorNoInputField.focus();
    }

}

/**************************************************************
 * returnFocus()
 * Moves focus out of a dialog that is about to be hidden, back to
 * the button that opened the modal. A hidden dialog that still
 * holds focus leaves screen reader users stranded, and Chrome
 * blocks aria-hidden on it.
 **************************************************************/
function returnFocus(dialog) {
    if (!dialog.contains(document.activeElement)) return;
    if (modalOpener && modalOpener !== document.body && document.contains(modalOpener)) {
        modalOpener.focus();
    }
    // Still inside the dialog (no opener to go back to): let go of focus
    if (dialog.contains(document.activeElement)) {
        document.activeElement.blur();
    }
}

function closeModal() {
    if (!overlay) return;

    returnFocus(overlay);
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-modal-open');

    if (form) {
        form.reset();
    }
    signaturePads.forEach((pad) => pad.clear());
    closeAllHelp();
    closeChecklistNotes();
}

/**************************************************************
 * Form help
 * Each ? button beside a label (.inspection-help-toggle) opens or
 * closes the short note named in its aria-controls. They all start
 * closed, and closeModal() folds any open ones away again.
 **************************************************************/
function setHelpOpen(button, open) {
    const panel = form && form.querySelector(`#${button.getAttribute('aria-controls')}`);
    if (!panel) return;
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
}

function closeAllHelp() {
    if (!form) return;
    form.querySelectorAll('.inspection-help-toggle').forEach((button) => setHelpOpen(button, false));
}

/**************************************************************
 * Checklist notes
 * The ? beside a checklist item (.inspection-check__help) opens
 * its note, the <dialog> named in aria-controls, as a card over
 * the form. The card closes with its Close button, with Escape,
 * or with a tap on the dimmed area around it, and the browser puts
 * focus back on the ?. While a card is open, Escape closes only
 * the card: the keydown handler below leaves the form open.
 **************************************************************/
function openChecklistNote(button) {
    const card = form && form.querySelector(`#${button.getAttribute('aria-controls')}`);
    if (card && !card.open) {
        card.showModal();
    }
}

function checklistNoteOpen() {
    return Boolean(form && form.querySelector('dialog.inspection-card[open]'));
}

function closeChecklistNotes() {
    if (!form) return;
    form.querySelectorAll('dialog.inspection-card[open]').forEach((card) => card.close());
}

/**************************************************************
 * updateRepairSection()
 * Shows the mechanic's certification and the next driver's line
 * (#repairSection) once any defect is ticked, and the note that
 * stands in for them until then. withoutRepairFields() in utils.js
 * leaves out anything filled in there while it's hidden.
 **************************************************************/
function updateRepairSection() {
    const repairSection = document.querySelector('#repairSection');
    const repairNote = document.querySelector('#repairNote');
    if (!form || !repairSection) return;

    const showRepairs = hasDefects(readFormData());
    repairSection.hidden = !showRepairs;
    if (repairNote) {
        repairNote.hidden = showRepairs;
    }
    // A hidden pad has no size, so the mechanic's is sized when it shows
    if (showRepairs) {
        const mechanicPad = signaturePads.get('mechanicSignature');
        if (mechanicPad) {
            mechanicPad.resize();
        }
    }
}

/**************************************************************
 * createSignaturePad()
 * Turns one .inspection-sig-pad into a pad to sign with a finger,
 * stylus or mouse (pointer events cover all three). Returns:
 *   resize()    sizes the canvas to its box; called when the modal opens
 *   clear()     wipes the pad
 *   toDataUrl() the signature cropped to its ink, as a small PNG data
 *               URL, or undefined while the pad is blank
 **************************************************************/
const SIGNATURE_EXPORT = { maxWidth: 600, maxHeight: 150, margin: 6 };

function createSignaturePad(element) {
    const canvas = element.querySelector('.inspection-sig-pad__canvas');
    const clearButton = element.querySelector('.inspection-sig-pad__clear');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let last = null;
    // The inked area in CSS pixels, or null while the pad is blank
    let ink = null;

    function pointAt(event) {
        const box = canvas.getBoundingClientRect();
        return { x: event.clientX - box.left, y: event.clientY - box.top };
    }

    function strokeTo(point) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        last = point;
        ink = {
            minX: Math.min(ink.minX, point.x),
            minY: Math.min(ink.minY, point.y),
            maxX: Math.max(ink.maxX, point.x),
            maxY: Math.max(ink.maxY, point.y),
        };
    }

    function resize() {
        // Resizing a canvas wipes it, so leave a signature in place
        const box = canvas.getBoundingClientRect();
        if (ink || !box.width) return;
        const scale = window.devicePixelRatio || 1;
        canvas.width = Math.round(box.width * scale);
        canvas.height = Math.round(box.height * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111';
    }

    function clear() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ink = null;
    }

    function toDataUrl() {
        if (!ink) return undefined;

        // Crop to the ink plus a margin, in the canvas's own pixels
        const scale = canvas.width / canvas.getBoundingClientRect().width;
        const margin = SIGNATURE_EXPORT.margin;
        const sx = Math.max(0, (ink.minX - margin) * scale);
        const sy = Math.max(0, (ink.minY - margin) * scale);
        const sw = Math.min(canvas.width - sx, (ink.maxX - ink.minX + 2 * margin) * scale);
        const sh = Math.min(canvas.height - sy, (ink.maxY - ink.minY + 2 * margin) * scale);

        // Shrink it until it fits the size the server accepts
        let fit = Math.min(1, SIGNATURE_EXPORT.maxWidth / sw, SIGNATURE_EXPORT.maxHeight / sh);
        for (let attempt = 0; attempt < 4; attempt++) {
            const output = document.createElement('canvas');
            output.width = Math.max(1, Math.round(sw * fit));
            output.height = Math.max(1, Math.round(sh * fit));
            output.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, output.width, output.height);
            const image = output.toDataURL('image/png');
            if (isSignatureImage(image)) return image;
            fit *= 0.7;
        }
        return undefined;
    }

    canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        drawing = true;
        last = pointAt(event);
        ink = ink || { minX: last.x, minY: last.y, maxX: last.x, maxY: last.y };
        // A tap leaves a dot
        strokeTo({ x: last.x + 0.1, y: last.y });
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!drawing) return;
        // Fast strokes arrive as several points per event
        const points = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
        (points.length ? points : [event]).forEach((point) => strokeTo(pointAt(point)));
    });
    ['pointerup', 'pointercancel'].forEach((type) => {
        canvas.addEventListener(type, () => {
            drawing = false;
        });
    });
    clearButton.addEventListener('click', clear);

    return { resize, clear, toDataUrl };
}

function showModalFlash(message) {
    const banner = document.querySelector('#modalFlashError');
    const msg = document.querySelector('#modalFlashErrorMsg');
    if (!banner || !msg) return;

    msg.textContent = message;
    banner.hidden = false;
}

function clearModalFlash() {
    const banner = document.querySelector('#modalFlashError');
    if (banner) banner.hidden = true;
}

function openResultOverlay() {
    if (!resultOverlay) return;

    resultOverlay.classList.add('is-open');
    resultOverlay.removeAttribute('aria-hidden');
    document.body.classList.add('has-modal-open');

    if (closeResultBtn) {
        closeResultBtn.focus();
    }
}

function closeResultOverlay() {
    if (!resultOverlay) return;

    returnFocus(resultOverlay);
    resultOverlay.classList.remove('is-open');
    resultOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-modal-open');
    currentInspectionReport = null;
    currentInspectionData = null;

    if (reloadOnResultClose) {
        window.location.reload();
    }
}

/**************************************************************
 * showSaveStatus()
 * Tells a signed-in user, inside the result popup, whether their
 * inspection was saved to their account. Guests see a fixed note
 * in the popup instead (inspectionModal.ejs).
 **************************************************************/
function showSaveStatus(message, failed) {
    if (!saveStatus) return;
    saveStatus.textContent = message;
    saveStatus.classList.toggle('result-dialog__status--error', failed);
}

/**************************************************************
 * countInspection()
 * Adds one to the public "reports generated" counter. A failure
 * only means the counter misses one, so it is ignored.
 **************************************************************/
function countInspection() {
    fetch('/inspections/count', { method: 'POST', headers: JSON_HEADERS }).catch(() => {});
}

/**************************************************************
 * saveInspection()
 * Saves a signed-in user's inspection to their account.
 * Returns { ok: true }, or { ok: false, message } where the message
 * says what went wrong. It never throws: the PDF already exists,
 * and a failed save mustn't take it away from the driver.
 **************************************************************/
async function saveInspection(inspection) {
    try {
        const response = await fetch('/inspections', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify(inspection),
        });
        if (response.ok) {
            return { ok: true };
        }
        if (response.status === 401) {
            return { ok: false, message: 'Your session has ended, so log in again to save inspections.' };
        }
        const data = await response.json().catch(() => ({}));
        return { ok: false, message: data.error || 'Something went wrong. Please try again.' };
    } catch {
        return { ok: false, message: 'Check your connection and try again.' };
    }
}

/**************************************************************
 * viewPDF()
 * Opens the generated PDF for the user to view without downloading.
 * Desktop: uses output('bloburl') and opens in a new tab via window.open()
 * Mobile/iOS Safari: blob URLs in window.open() are unreliable, so we fall back
 * to output('datauristring') and create a temporary <a> element with target="_blank"
 * Parameters: This function takes in no parameters.
 * Returns: This function returns nothing.
 ***************************************************************/
function viewPDF() {
    if (!currentInspectionReport) return;
    
    const blobUrl = currentInspectionReport.output('bloburl');
    window.open(blobUrl, '_blank', 'noopener,noreferrer');    
}

/**************************************************************
 * readFormData()
 * When a guest submits the form, this function iterates through the input fields and returns an object
 * Parameters: This function takes in no parameters.
 * Returns: This function returns an object.
 * Examples: 
 * If we are given:         should return:
 * Date <input>             String "2/17/2026"
 * truckTractorNo <input>   String "1234567"
 * defects <input>          Boolean { truckTractorNo: { steering: true }, trailer: { brakes: true} }
 * trailerNo <input>        String "1234567"
 * remarks <input>          String "Turning the steering wheel fully to either direction creates a noise, needs power steering fluid. Brakes are screeching and truck needs maintenance"
 * mechanicDate <input>     String "" intentionally left blank to print/sign irl
 * driverDate <input>       String "" same as above

* 0 We create two varibles, formData instantiates the FormData object using the new keyword. We create an empty object using literal notation
* 1. We iterate through the form submitted by the user. Logging the value returns:
    * 2/17/2026 1234567 true 1234567 true Hello world <empty string> <empty string>
* 2. We iterate through the form submitted by the user. Logging the key reurns:
    * date truckTractorNo defects[truckTractor][steering]^ trailerNo defects[trailer][brakes]^ remarks mechanicDate driverDate
        * ^defects is an object and we are using bracket notation to access the object 
* 3. We create a variable that uses the array method includes() to search the current key for an open bracket '['
* 4. We create a variable that uses the array methods split(), map(), replace() on the current key
    * 3 & 4 are solely used when the defects <input> contains value(s)
* 5. We determine if the current key contains an open bracket
    * a. When the current key does contain an open bracket: see #6
        * We drill further into the object, (e.g FormData object -> defects object -> truckTractor/Trailer object(s)) and iterate further
    * b. Otherwise we access the userInspection object using bracket notation & the index(key), and add the element(value) to the userInspection object

* 6. When the current key does contain an open bracket we iterate further by drilling into the object
    * As we iterate through keys, logging (2) the key & (3) hasBracket variables returns:
        * Output: date false, truckTractorNo false, defects[truckTractor][Steering] true, etc..
    * The keys variable (4) has a few moving parts and below is the behavior of logging each individual part
        * Logging key.split('[') returns an array of strings:
            * Output: ['defects', 'truckTractorNo]', 'Steering]'] Take notice of the ending brackets ']'
        * Logging key.split('[').map((element, index) => console.log(element))^ returns individual strings with ']' still there
            * ^HOWEVER, replacing console.log(element) with element.replace(']', ''), returns an array of strings
                *  Output: ['defects', 'truckTractorNo', 'Steering'] Take notice that ']' is replaced with an empty string

7. We create two variables, one contains an expression that compares the current index to the number of elements within the array of strings. 2nd variable see: #10
8. We determine if we are at the last element within the array
    * a. If we are at the last element: We determine if the value (1) compared to a boolean or an empty string evaluates as true
        * Depending on the evaluation, we add the value(value,null,boolean) to the user's inspection
    * b. Otherwise, we are not at the last element: We need to create an empty object and: 
        * c. We go deeper into the object until we reach the last element, then see #8a
9. We return an object and, (containing the value of every <input> from the form) pass it into validateAndSanitize() as an argument

10. Additional explanation: We create a variable which points at the current element, at the start of the object
    * examples: START: pointingAt -> {} userInspection object 
    * ITERATE: currentValue = defects -> not the last element:
        * Create an object -> userInspection object { defects: {} <- pointingAt }
    * ITERATE: currentValue = truckTractor -> not the last element: 
        * Create an object -> userInspection object { defects: { truckTractor: {} <- pointingAt } }
    * ITERATE: currentValue = Steering -> the last element
        * Store the value using bracket notation -> pointingAt['Steering'] = true
    * userInspection object: { defects: { truckTractor: { Steering: true } } }
***************************************************************/
function readFormData() {
    // 0
    const formData = new FormData(form);
    const userInspection = {};
    
    // 1. value - 2. key
    formData.forEach((value, key) => {
        // 3. hasBracket - 4. keys
        const hasBrackets = key.includes('[');
        const keys = key.split('[').map((element, index) => element.replace(']', ''));
        
        // 5a
        if (hasBrackets) {
            // 10
            let pointingAt = userInspection;
            // 6
            keys.forEach((currentValue, index) => {
                // 7
                const theLastValue = (index === keys.length - 1)
                // 8a 
                if (theLastValue) {
                    if (value === 'true') {
                        pointingAt[currentValue] = true;
                    } else if (value === '') {
                        pointingAt[currentValue] = null;
                    } else {
                        pointingAt[currentValue] = value;
                    }
                } else {
                    // 8b
                    if (!pointingAt[currentValue]) {
                        pointingAt[currentValue] = {};
                    }
                    // 8c
                    pointingAt = pointingAt[currentValue];
                }

            })
        } else {
            // 5b
            userInspection[key] = value;
        }

    })
    return userInspection
}

/**************************************************************
 * sanitizeText(), validateAndSanitize() and decodeHTMLEntities()
 * now live in public/js/utils.js, which footer.ejs loads before this
 * file. 
 *
 * validateAndSanitize stays pure so it remains testable. The DOM
 * feedback it used to perform lives in flagMissingTruckNumber() below.
 **************************************************************/

/**************************************************************
 * flagMissingTruckNumber()
 * Called when validateAndSanitize() rejects the form for a missing
 * Truck / Tractor No. Shows the modal flash, focuses the field and
 * marks it, then clears both on the next keystroke.
 **************************************************************/
function flagMissingTruckNumber() {
    const truckTractorNoInputField = document.querySelector('#truckTractorNo');
    if (!truckTractorNoInputField) return;

    showModalFlash('Truck / Tractor No. is required before generating a PDF.');
    truckTractorNoInputField.focus();
    truckTractorNoInputField.classList.add('input--error');
    truckTractorNoInputField.addEventListener('input', () => {
        truckTractorNoInputField.classList.remove('input--error');
        clearModalFlash();
    }, { once: true });
}

/**************************************************************
 * generateDVIRPDF()
 * This function takes in the sanitized object and returns an (instance of jsPDF class) object
 * Parameters: This function takes in one parameter.
 * Returns: This function returns an object.
 * Examples: 
 * If we are given:                 should return:
 * {                                {Promise<jsPDF>} - A promise that resolves to a jsPDF object
  "date": "3/5/2026",
  "truckTractorNo": "1234567",
  "defects": {
    "truckTractor": {
      "steering": true,
      "brakes": true,
      "safetyEquipment": true
    }
  },
  "trailerNo": "",
  "remarks": "",
  "mechanicDate": "",
  "driverDate": "",
  "id": "1772771025543",
  "createdAt": "2026-03-06T04:23:45.543Z"
}

* 0. generateDVIRPDF uses an async function because we need to load an image before adding to it
* Script tag loads the jspdf object (views/partials/footer.ejs - line 43)
    * 1. I destructure the jsPDF property from the jspdf object 

* 2. I create a variable which instantiates the jsPDF class using the new keyword, and pass in the arguments to create the document 
(parameters: https://artskydj.github.io/jsPDF/docs/jsPDF.html)

* 3. I create a variable which instatiates the HTMLImageElement class using the new keyword, and set the src attribute 
* 4a. I use the await keyword to allow the code to wait until the Promise is settled
* 4b. I use constructor syntax to create the promise object
* 4c. The executor assigns resolve onto the onload property before our image is loaded
* 4d. The executor assigns reject onto the onerror property before our image is loaded
* 5. I use jsPDF's addImage() method, and pass in the parameters to use an image as a template
(parameters: https://artskydj.github.io/jsPDF/docs/module-addImage.html)
* 6. Set the font styling
* 7. Populates the date, truckTractorNo, and trailerNo from the argument as a string. If the field is empty, display an empty string
    * X / Y coordinates are given to mark where the strings will be populated
    * field() runs every value through decodeHTMLEntities, because inspections saved in 2025 can hold entities like &#x27;
* 8. A function that stamps an 'X' when the user input evaluates as true, on given coordinates
* 9. I use optional chaining to determine if the sanitizedUserInspectionObject contains any true property-values within the defects property
* 10. I call the xMark function to populate an 'X' on given coordinates
* 11. Converts string 'true' to boolean, checkboxes stay as strings. readFormData returns string 'true' for checkboxes.
* 12. I determine if the input field(s) for driver/mechanic date contains a value, and populate the value as a string
    * This is different from the date from step 7. These dates exist near the bottom of the Driver's Vehicle Inspection Report
* 13. I split the remarks into lines that fit the Remarks box, and write each one just above a ruled line
    * Up to 6 lines go on the form. Longer remarks put 5 lines there, a "continue on page 2" note on the 6th,
      and the rest on a second page headed "Remarks (continued)" with the truck number and date
* 14. I stamp any drawn signatures (driver, mechanic) just above their lines on page 1, scaled to fit
***************************************************************/
// 0
async function generateDVIRPDF(sanitizedUserInspectionObject) {
    // 1
    const { jsPDF } = jspdf;

    // 2
    const driverVehicleInspectionReport = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      })

    // 3
    const imageOfDVIR = new Image();
    imageOfDVIR.src = '/imgs/dvir-template.png';
    // 4a       4b
    await new Promise((resolve, reject) => {
        // 4c
        imageOfDVIR.onload = resolve;
        // 4d
        imageOfDVIR.onerror = () => reject(new Error('Unable to load the image.'));
    })
    // 5
    driverVehicleInspectionReport.addImage(imageOfDVIR, 'PNG', 0, 0, 216, 280);
    // 6
    driverVehicleInspectionReport.setTextColor(0, 0, 0);
    driverVehicleInspectionReport.setFontSize(11);
    // 7. Text fields. field() also decodes the HTML entities that inspections
    // saved in 2025 can contain (see decodeHTMLEntities in utils.js)
    const field = (value) => decodeHTMLEntities(String(value || ''));
    driverVehicleInspectionReport.text(field(sanitizedUserInspectionObject.date), 30, 41);
    driverVehicleInspectionReport.text(field(sanitizedUserInspectionObject.truckTractorNo), 60, 50);
    driverVehicleInspectionReport.text(field(sanitizedUserInspectionObject.trailerNo), 55, 150);
    // 8
    const xMark = (checked, x, y) => {
        if (checked === true) {
            driverVehicleInspectionReport.text('X', x, y);
        } 
    };
    // 9
    const truckTractor = sanitizedUserInspectionObject.defects?.truckTractor || {};
    const truckTrailer = sanitizedUserInspectionObject.defects?.trailer || {};

    // 10 
    xMark(truckTractor.airCompressor, 13, 58);
    xMark(truckTractor.airLines, 13, 63);
    xMark(truckTractor.battery, 13, 68);
    xMark(truckTractor.brakeAccessories, 13, 73);
    xMark(truckTractor.brakes, 13, 79);
    xMark(truckTractor.carburetor, 13, 84);
    xMark(truckTractor.clutch, 13, 90);
    xMark(truckTractor.defroster, 13, 95);
    xMark(truckTractor.driveLine, 13, 100);
    xMark(truckTractor.engine, 13, 105);
    xMark(truckTractor.fifthWheel, 13, 110);
    xMark(truckTractor.frontAxle, 13, 115);
    xMark(truckTractor.fuelTanks, 13, 120);
    xMark(truckTractor.heater, 13, 126);
    xMark(truckTractor.horn, 78, 58);
    xMark(truckTractor.lights, 78, 63);
    xMark(truckTractor.mirrors, 78, 84);
    xMark(truckTractor.muffler, 78, 90);
    xMark(truckTractor.oilPressure, 78, 95);
    xMark(truckTractor.onBoardRecorder, 78, 100);
    xMark(truckTractor.radiator, 78, 105);
    xMark(truckTractor.rearEnd, 78, 110);
    xMark(truckTractor.reflectors, 78, 115);
    xMark(truckTractor.safetyEquipment, 78, 120);
    xMark(truckTractor.springs, 143, 57);
    xMark(truckTractor.starter, 143, 62);
    xMark(truckTractor.steering, 143, 68);
    xMark(truckTractor.tachograph, 143, 74);
    xMark(truckTractor.tires, 143, 79);
    xMark(truckTractor.transmission, 143, 84);
    xMark(truckTractor.wheels, 143, 89);
    xMark(truckTractor.windows, 143, 94);
    xMark(truckTractor.windshieldWipers, 143, 100);
    xMark(truckTractor.other, 143, 105);
    xMark(truckTrailer.brakeConnections, 13, 156);
    xMark(truckTrailer.brakes, 13, 162);
    xMark(truckTrailer.couplingChains, 13, 167);
    xMark(truckTrailer.couplingPin, 13, 172);
    xMark(truckTrailer.doors, 13, 177);
    xMark(truckTrailer.hitch, 78, 156);
    xMark(truckTrailer.landingGear, 78, 162);
    xMark(truckTrailer.lightsAll, 78, 167);
    xMark(truckTrailer.roof, 78, 172);
    xMark(truckTrailer.springs, 78, 177);
    xMark(truckTrailer.tarpaulin, 143, 155);
    xMark(truckTrailer.tires, 143, 161);
    xMark(truckTrailer.wheels, 143, 166);
    xMark(truckTrailer.other, 143, 171);

    // 11
    const isTrue = value => value === true || value === 'true';
    xMark(isTrue(sanitizedUserInspectionObject.conditionSatisfactory), 13, 224);
    xMark(isTrue(sanitizedUserInspectionObject.defectsCorrected), 13, 241);
    xMark(isTrue(sanitizedUserInspectionObject.defectsNotCorrected), 13, 249);

    // 12
    if (sanitizedUserInspectionObject.mechanicDate) {
        driverVehicleInspectionReport.text(field(sanitizedUserInspectionObject.mechanicDate), 165, 257);
    }
    if (sanitizedUserInspectionObject.driverDate) {
        driverVehicleInspectionReport.text(field(sanitizedUserInspectionObject.driverDate), 165, 266);
    }

    // 13. Remarks. The form has six ruled lines under "Remarks:", at these
    // heights in mm (measured from dvir-template.png), and each line of text
    // sits just above one. Longer remarks use five, say so on the sixth, and
    // continue on a second page, so a defect note never runs over the
    // certification section below.
    const REMARK_RULES = [190.4, 195.6, 201.0, 206.2, 211.4, 216.9];
    const remarksLines = driverVehicleInspectionReport.splitTextToSize(field(sanitizedUserInspectionObject.remarks), 160);
    const fitsOnForm = remarksLines.length <= REMARK_RULES.length;
    const linesOnForm = fitsOnForm ? remarksLines : remarksLines.slice(0, REMARK_RULES.length - 1);

    linesOnForm.forEach((line, index) => {
        driverVehicleInspectionReport.text(line, 30, REMARK_RULES[index] - 1);
    });

    if (!fitsOnForm) {
        driverVehicleInspectionReport.setFont('helvetica', 'italic');
        driverVehicleInspectionReport.text('Remarks continue on page 2.', 30, REMARK_RULES[REMARK_RULES.length - 1] - 1);

        driverVehicleInspectionReport.addPage('letter', 'portrait');
        driverVehicleInspectionReport.setFont('helvetica', 'bold');
        driverVehicleInspectionReport.setFontSize(14);
        driverVehicleInspectionReport.text('Remarks (continued)', 20, 25);
        driverVehicleInspectionReport.setFont('helvetica', 'normal');
        driverVehicleInspectionReport.setFontSize(11);
        driverVehicleInspectionReport.text(`Truck / Tractor No. ${field(sanitizedUserInspectionObject.truckTractorNo)}    Date: ${field(sanitizedUserInspectionObject.date)}`, 20, 33);

        // jsPDF reports line height in points; the document is laid out in mm
        const lineHeight = driverVehicleInspectionReport.getLineHeight() / driverVehicleInspectionReport.internal.scaleFactor;
        let y = 45;
        remarksLines.slice(linesOnForm.length).forEach((line) => {
            // Remarks are capped at 2000 characters, which fits on page 2,
            // but keep going on a new page rather than off the bottom
            if (y > 265) {
                driverVehicleInspectionReport.addPage('letter', 'portrait');
                y = 25;
            }
            driverVehicleInspectionReport.text(line, 20, y);
            y += lineHeight;
        });
    }

    // 14. Drawn signatures, fitted just above the driver's and mechanic's
    // lines on page 1 (long remarks may have moved jsPDF on to page 2).
    // Only PNG data URLs from the pads count; old saved text is left out.
    // Heights stop about 1.5 mm below the printed line above each signature.
    const SIGNATURE_BOXES = {
        driverSignature: { x: 50, bottom: 232.3, maxWidth: 75, maxHeight: 7 },
        mechanicSignature: { x: 57, bottom: 257.0, maxWidth: 75, maxHeight: 7 },
    };
    driverVehicleInspectionReport.setPage(1);
    Object.entries(SIGNATURE_BOXES).forEach(([field, box]) => {
        const image = sanitizedUserInspectionObject[field];
        if (!isSignatureImage(image)) return;
        try {
            const { width, height } = driverVehicleInspectionReport.getImageProperties(image);
            const fit = Math.min(box.maxWidth / width, box.maxHeight / height);
            driverVehicleInspectionReport.addImage(image, 'PNG', box.x, box.bottom - height * fit, width * fit, height * fit);
        } catch (err) {
            // A damaged image shouldn't stop the rest of the PDF
            console.error(`Skipped a ${field} that could not be read:`, err);
        }
    });

    return driverVehicleInspectionReport;
}

/**
 * Hero canvas: floating "p" / "q" letters that bounce inside the hero (pretriq brand nod).
 * Skipped when the canvas is missing or the user prefers reduced motion.
 */
function initHeroLetterBounceCanvas() {
    const canvas = document.querySelector('#hero-particles');
    const hero = document.querySelector('.hero');
    if (!canvas || !hero) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const letterChars = ['p', 'q'];
    /** Same palette as the legacy hero canvas */
    const palette = ['#66bb6a', '#42a5f5', '#ffd600'];
    const letterCount = 12;
    const letters = [];
    let widthCss = 1;
    let heightCss = 1;
    let rafId = 0;
    let lastTs = 0;
    let running = true;

    function measureGlyph(char, fontSize) {
        ctx.font = `700 ${fontSize}px Lato, Roboto, system-ui, sans-serif`;
        const m = ctx.measureText(char);
        const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.72;
        const descent = m.actualBoundingBoxDescent ?? fontSize * 0.28;
        const w = m.width;
        return { w, ascent, descent, fontSize };
    }

    function clampLetter(L) {
        const { w, ascent, descent } = measureGlyph(L.char, L.fontSize);
        const top = L.y - ascent;
        const bottom = L.y + descent;
        if (L.x < 0) L.x = 0;
        if (L.x + w > widthCss) L.x = widthCss - w;
        if (top < 0) L.y = ascent;
        if (bottom > heightCss) L.y = heightCss - descent;
    }

    function spawnLetters() {
        letters.length = 0;
        for (let i = 0; i < letterCount; i++) {
            const char = letterChars[i % 2];
            const fontSize = 26 + Math.random() * 34;
            const { w, ascent, descent } = measureGlyph(char, fontSize);
            const speed = 55 + Math.random() * 75;
            const angle = Math.random() * Math.PI * 2;
            letters.push({
                char,
                fontSize,
                color: palette[Math.floor(Math.random() * palette.length)],
                alpha: 0.15 + Math.random() * 0.4,
                x: Math.random() * Math.max(1, widthCss - w),
                y: ascent + Math.random() * Math.max(1, heightCss - ascent - descent),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
            });
        }
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = hero.getBoundingClientRect();
        widthCss = Math.max(1, rect.width);
        heightCss = Math.max(1, rect.height);
        canvas.width = Math.floor(widthCss * dpr);
        canvas.height = Math.floor(heightCss * dpr);
        canvas.style.width = `${widthCss}px`;
        canvas.style.height = `${heightCss}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        letters.forEach(clampLetter);
    }

    function bounce(L) {
        const { w, ascent, descent } = measureGlyph(L.char, L.fontSize);
        const left = L.x;
        const right = L.x + w;
        const top = L.y - ascent;
        const bottom = L.y + descent;

        if (left < 0) {
            L.x = 0;
            L.vx = Math.abs(L.vx);
        } else if (right > widthCss) {
            L.x = widthCss - w;
            L.vx = -Math.abs(L.vx);
        }

        if (top < 0) {
            L.y = ascent;
            L.vy = Math.abs(L.vy);
        } else if (bottom > heightCss) {
            L.y = heightCss - descent;
            L.vy = -Math.abs(L.vy);
        }
    }

    function frame(ts) {
        if (!running) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min((ts - lastTs) / 1000, 0.064);
        lastTs = ts;

        ctx.clearRect(0, 0, widthCss, heightCss);

        for (const L of letters) {
            L.x += L.vx * dt;
            L.y += L.vy * dt;
            bounce(L);

            ctx.save();
            ctx.globalAlpha = L.alpha;
            ctx.font = `700 ${L.fontSize}px Lato, Roboto, system-ui, sans-serif`;
            ctx.fillStyle = L.color;
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(L.char, L.x, L.y);
            ctx.restore();
        }

        rafId = requestAnimationFrame(frame);
    }

    resize();
    spawnLetters();

    const ro = new ResizeObserver(() => {
        resize();
    });
    ro.observe(hero);

    rafId = requestAnimationFrame(frame);

    window.addEventListener('pagehide', () => {
        running = false;
        cancelAnimationFrame(rafId);
        ro.disconnect();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    signaturePadElements.forEach((element) => {
        signaturePads.set(element.dataset.field, createSignaturePad(element));
    });

    // The dashboard filter's From and To are the driver's local days, so the
    // form sends the browser's time zone along (utils/inspectionFilter.js).
    // The CSV export needs it too, for its local "Saved" times and file name.
    const timezoneOffset = String(new Date().getTimezoneOffset());
    if (filterTz) {
        filterTz.value = timezoneOffset;
    }
    if (exportLink) {
        const exportUrl = new URL(exportLink.href);
        exportUrl.searchParams.set('tz', timezoneOffset);
        exportLink.href = exportUrl.pathname + exportUrl.search;
    }

    const yearEl = document.querySelector('#current-year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    /**************************************************************
     * Consent banner
     * Show the banner only on first visit (no stored preference).
     * Accept: inject GA and store 'granted'.
     * Decline: store 'declined', banner hides, GA never loads.
     **************************************************************/
    const consentBanner = document.querySelector('#consentBanner')
    const consentAccept = document.querySelector('#consentAccept')
    const consentDecline = document.querySelector('#consentDecline')

    if (consentBanner && !gaConsent) {
        consentBanner.hidden = false
    }

    if (consentAccept) {
        consentAccept.addEventListener('click', () => {
            localStorage.setItem('pretriq_ga_consent', 'granted')
            injectGA()
            consentBanner.hidden = true
        })
    }

    if (consentDecline) {
        consentDecline.addEventListener('click', () => {
            localStorage.setItem('pretriq_ga_consent', 'declined')
            consentBanner.hidden = true
        })
    }

    const inspectionBtn = document.querySelector('#startInspectionBtn');
    const submitInspectionBtn = document.querySelector('#submitInspectionBtn');
    const saveInspectionBtn = document.querySelector('#saveInspectionBtn');
    const cancelInspetionBtn = document.querySelector('#cancelInspectionBtn')

    // Modal behavior start
    if (inspectionBtn) {
        inspectionBtn.addEventListener('click', openModal);
    }

    
    if (cancelInspetionBtn) {
        cancelInspetionBtn.addEventListener('click', closeModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        })
    }

    // One listener for every ? button and checklist note in the form, and one
    // for the defect checkboxes, which show or hide the repair section
    if (form) {
        form.addEventListener('click', (event) => {
            const helpButton = event.target.closest('.inspection-help-toggle');
            if (helpButton) {
                setHelpOpen(helpButton, helpButton.getAttribute('aria-expanded') !== 'true');
                return;
            }
            const noteButton = event.target.closest('.inspection-check__help');
            if (noteButton) {
                openChecklistNote(noteButton);
                return;
            }
            // A tap on the dimmed area around a card lands on the <dialog> itself
            const card = event.target.closest('dialog.inspection-card');
            if (card && (event.target === card || event.target.closest('.inspection-card__close'))) {
                card.close();
            }
        });
        form.addEventListener('change', (event) => {
            if (event.target.name && event.target.name.startsWith('defects[')) {
                updateRepairSection();
            }
        });
    }
    
    document.addEventListener('keydown', (event) => {
        // Escape over a checklist note closes just the note: the browser
        // does that, after this listener, and the form stays open
        if (event.key === 'Escape' && overlay && overlay.classList.contains('is-open') && !checklistNoteOpen()) {
            closeModal();
        }
    });
    
    /**************************************************************
     * runInspection()
     * Shared by the guest and signed-in buttons. It builds the PDF
     * first and only then closes the modal, so if jsPDF or the form
     * image fails to load, the driver's answers are still in the
     * form and the modal says what happened.
     * Returns the cleaned inspection, or null if no PDF was made.
     ***************************************************************/
    async function runInspection() {
        const sanitizedUserInspectionObject = validateAndSanitize(readFormData());
        if (!sanitizedUserInspectionObject) {
            flagMissingTruckNumber();
            return null;
        }

        // The signature pads aren't form fields, so add what was drawn
        signaturePads.forEach((pad, field) => {
            const image = pad.toDataUrl();
            if (image) {
                sanitizedUserInspectionObject[field] = image;
            }
        });
        // Without a defect, the hidden repair section stays off the report
        const inspection = withoutRepairFields(sanitizedUserInspectionObject);

        try {
            currentInspectionReport = await generateDVIRPDF(inspection);
        } catch (err) {
            console.error('PDF generation failed:', err);
            showModalFlash('The PDF could not be created. Check your connection and try again.');
            return null;
        }

        currentInspectionData = inspection;
        closeModal();
        return inspection;
    }

    // Disables a button while its handler runs, so a double click can't
    // build two PDFs or save the same inspection twice
    function whileBusy(button, handler) {
        return async () => {
            if (button.disabled) return;
            button.disabled = true;
            try {
                await handler();
            } finally {
                button.disabled = false;
            }
        };
    }

    // Guest: generate the PDF, then count it
    if (submitInspectionBtn) {
        submitInspectionBtn.addEventListener('click', whileBusy(submitInspectionBtn, async () => {
            if (!(await runInspection())) return;
            countInspection();
            openResultOverlay();
        }));
    }

    // Signed in: generate the PDF, save it to the account, and count it only
    // once the save succeeds, so failed saves don't inflate the count. The
    // popup opens right away and then reports how the save went.
    if (saveInspectionBtn) {
        saveInspectionBtn.addEventListener('click', whileBusy(saveInspectionBtn, async () => {
            const inspection = await runInspection();
            if (!inspection) return;

            showSaveStatus('Saving to your dashboard…', false);
            openResultOverlay();

            const saved = await saveInspection(inspection);
            if (saved.ok) {
                countInspection();
                showSaveStatus('Saved to your dashboard.', false);
                reloadOnResultClose = Boolean(document.querySelector('.dashboard'));
            } else {
                showSaveStatus(`Your PDF is ready, but it wasn't saved to your account. ${saved.message} Download the PDF now so you keep a copy.`, true);
            }
        }));
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (!currentInspectionReport) return;
            currentInspectionReport.save(pdfFileName(currentInspectionData && currentInspectionData.truckTractorNo, new Date()));
        });
    }

    if (viewPdfBtn) {
        viewPdfBtn.addEventListener('click', viewPDF);
    }

    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', closeResultOverlay);
    }

    if (resultOverlay) {
        resultOverlay.addEventListener('click', (event) => {
            if (event.target === resultOverlay) {
                closeResultOverlay();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && resultOverlay && resultOverlay.classList.contains('is-open')) {
            closeResultOverlay();
        }
    });
    // Modal behavior end

    initHeroLetterBounceCanvas();
});

/**************************************************************
 * Flash dismiss
 * Delegated listener on the flash-stack handles all .flash__close
 * buttons. Adds is-dismissing class to trigger exit animation,
 * then removes the element once the animation completes.
 ***************************************************************/
const flashStack = document.querySelector('.flash-stack');

if (flashStack) {
    flashStack.addEventListener('click', (event) => {
        const closeBtn = event.target.closest('.flash__close');
        if (!closeBtn) return;
        const flash = closeBtn.closest('.flash');
        if (!flash) return;
        flash.classList.add('is-dismissing');
        flash.addEventListener('animationend', () => flash.remove(), { once: true });
    });
}

/**************************************************************
 * Re-download inspection from history
 * Fetches a saved inspection by id from the server, regenerates
 * the PDF client-side using the existing generateDVIRPDF function,
 * then triggers a download. The server verifies userId ownership
 * before returning data so no spoofing is possible.
 ***************************************************************/
const historyTable = document.querySelector('.historyTable');

if (historyTable) {
    historyTable.addEventListener('click', async (event) => {
        const btn = event.target.closest('.historyTable__redownload');
        if (!btn) return;

        const id = btn.dataset.id;
        if (!id || btn.disabled) return;

        // Keep the button's own label: its text changes while it works
        btn.dataset.label = btn.dataset.label || btn.textContent.trim();
        btn.textContent = 'Preparing…';
        btn.disabled = true;

        try {
            const response = await fetch(`/inspections/${id}`, {
                method: 'GET',
                headers: JSON_HEADERS,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch inspection (${response.status}).`);
            }

            const inspection = await response.json();
            const pdf = await generateDVIRPDF(inspection);
            pdf.save(pdfFileName(inspection.truckTractorNo, new Date(inspection.createdAt)));
            btn.textContent = 'Downloaded';
        } catch(err) {
            console.error('Re-download failed:', err);
            btn.textContent = 'Download failed. Try again';
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                btn.textContent = btn.dataset.label;
            }, 3000);
        }
    });
}

/**************************************************************
 * Confirm before deleting an inspection from history
 * Delegated submit listener intercepts delete form submissions
 * and prompts for confirmation. Cancelling prevents the submit.
 **************************************************************/
if (historyTable) {
    historyTable.addEventListener('submit', (event) => {
        const form = event.target.closest('.historyTable__deleteForm')
        if (!form) return
        if (!confirm('Delete this inspection? This action cannot be undone.')) {
            event.preventDefault()
        }
    })
}

/**************************************************************
 * Confirm before deleting an account
 * This used to be an inline onsubmit attribute on the form in
 * profile.ejs, which forced script-src-attr: 'unsafe-inline' into
 * the Content-Security-Policy. Same behaviour, no inline handler.
 **************************************************************/
const deleteAccountForm = document.querySelector('.profileCard__deleteForm')

if (deleteAccountForm) {
    deleteAccountForm.addEventListener('submit', (event) => {
        if (!confirm('Are you sure? This will permanently delete your account and all your inspections.')) {
            event.preventDefault()
        }
    })
}

/**************************************************************
* Hamburger nav as a user avatar menu
* Toggles the user menu dropdown when the avatar button is clicked.
***************************************************************/
const userNavToggle = document.querySelector('#userNavToggle')
const userNavMenu = document.querySelector('#userNavMenu')

if (userNavToggle && userNavMenu) {
    userNavToggle.addEventListener('click', () => {
        const isOpen = userNavMenu.classList.contains('is-open')
        userNavMenu.classList.toggle('is-open')
        userNavToggle.setAttribute('aria-expanded', String(!isOpen))
        userNavMenu.setAttribute('aria-hidden', String(isOpen))
    })

    document.addEventListener('click', (event) => {
        if (!userNavToggle.contains(event.target) && !userNavMenu.contains(event.target)) {
            userNavMenu.classList.remove('is-open')
            userNavToggle.setAttribute('aria-expanded', 'false')
            userNavMenu.setAttribute('aria-hidden', 'true')
        }
    })

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && userNavMenu.classList.contains('is-open')) {
            userNavMenu.classList.remove('is-open')
            userNavToggle.setAttribute('aria-expanded', 'false')
            userNavMenu.setAttribute('aria-hidden', 'true')
            userNavToggle.focus()
        }
    })
}
