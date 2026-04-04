const overlay = document.querySelector('#inspectionOverlay');
const form = document.querySelector('#inspectionForm');

function openModal() {
    if (!overlay) return;

    const dateField = document.querySelector('#date');
    const truckTractorNoInputField = document.querySelector('#truckTractorNo');

    if (dateField) {
        const todaysDate = new Date();
        dateField.value = `${todaysDate.getMonth() + 1}/${todaysDate.getDate()}/${todaysDate.getFullYear()}`; // Month/Day/Year
    }

    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    document.body.classList.add('has-modal-open');

    if (truckTractorNoInputField) {
        truckTractorNoInputField.focus();
    }
}

function closeModal() {
    if (!overlay) return;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-modal-open');

    if (form) {
        form.reset();
    }
}

function showModalFlash(message) {
    const banner = document.getElementById('modalFlashError');
    const msg = document.getElementById('modalFlashErrorMsg');
    if (!banner || !msg) return;

    msg.textContent = message;
    banner.hidden = false;
}

function clearModalFlash() {
    const banner = document.getElementById('modalFlashError');
    if (banner) banner.hidden = true;
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
                    console.log(`Added defect ${currentValue} to user's inspection`)
                } else {
                    // 8b
                    if (!pointingAt[currentValue]) {
                        console.log(`Created a new object for ${pointingAt[currentValue]}`)
                        pointingAt[currentValue] = {};
                    }
                    // 8c
                    pointingAt = pointingAt[currentValue];
                }

            })
        } else {
            // 5b
            console.log(`Added ${value} to user's inspection`)
            userInspection[key] = value;
        }

    })
    return userInspection
}

/**************************************************************
 * sanitizeText()
 * When a guest submits a form, this function iterates through the input(s) to remove characters that are used in XSS attacks.
 * Parameters: This function takes in one parameter.
 * Returns: This function returns a string.
 * Examples: 
 * If we are given:                 should return:
 * '<img src="#" onerror=alert(1)'  'img src=# onerror=alert(1)'
 * "'; DROP TABLE users; --"        '; DROP TABLE users; --'
 * '     hello `world`     '        'hello world'
 * 'C:\Program Files\'              'C:Program Files'

* This function takes in one parameter, and it is a string.
    * We want to declare a variable containing an array of characters used in Cross-site scripting attacks.
    * We want to iterate through the string-argument.
    * We want to compare the current letter against the array of characters.

* I declare two variables:
    * sanitized contains a blank string which will used to concatenate letters.
    * arrayOfStrings will be used to compare each letter from the string-argument to a set of characters.
* I check the user's input by using the typeof operator and the strict equality operator.
    * typeof determines if the argument passed in is a string.
        * I iterate through the string-argument using a for loop, which will be used to compare each individual letter in the argument.
            * I use the includes() method on the arrayOfStrings and pass in the current letter
                * I determine if the current letter is not character by using the (!) NOT operator:
                    * If the current letter is NOT a character, 
                        * I use the (+=) addition assignment operator to concatenate the current letter to the variable containing a blank string.
    * Otherwise the argument does not evaluate as a string, and we return an empty string.
* I use the trim() method on the variable containing a concatenated string and return the result.
    * Trim removes whitespace from both the start & end of a string.
***************************************************************/

function sanitizeText(string) {
    let sanitized = '';
    let arrayOfStrings = ['<', '>', '"', '`', "'", '\\'];

    if (typeof string === 'string') {

        for (let i = 0; i < string.length; i++) {
            if (!arrayOfStrings.includes(string[i])) {
                sanitized += string[i];
            }
        }

    } else {
        return '';
    }
    return sanitized.trim();
}

/**************************************************************
 * validateAndSanitize()
 * This function takes the current object-argument, sanitizes the property-values, then creates a new object using the same property names with sanitized property-values
 * Parameters: This function takes in one parameter.
 * Returns: This function returns an object.
 * Examples: 
 * If we are given:                 should return:
 * {                                {
  "date": "3/1/2026",               "date": "3/1/2026",
  "truckTractorNo": "<12\345'67>",  "truckTractorNo": "1234567",
  "defects": {                      "defects": {
    "truckTractor": {                 "truckTractor": {
      "airCompressor": true,            "airCompressor": true,
      "springs": true,                  "springs": true,
      "mirrors": true                   "mirrors": true
}                                   }
  },                                  },
  "trailerNo": "C:\Program Files\", "trailerNo": "C:Program Files",
  "remarks": "",                    "remarks": "",
  "mechanicDate": "",               "mechanicDate": "",
  "driverDate": ""                  "driverDate": ""
}                                   }

* This function takes in one parameter, and it is an object.

* I declare a variable which calls the sanitizeText() function
    * I pass in the truckTractorNo property-value from our object-argument
* I determine if the user submitted a truck-tractor number in their form
    * If there's no input, the input field on the modal is focused with the focus() method & I return null

* I create an object using literal notation
    * I use the (...) spread operator to iterate through the object-argument
        * The spread operator copies property & property-values from the object-argument into the new object
    * I assign new property-values which are sanitized by sanitizeText()
* I return a new object with sanitized property values
***************************************************************/

function validateAndSanitize(userInspectionObject) {
    const truckNo = sanitizeText(userInspectionObject.truckTractorNo);
    
    if (!truckNo) {
        const truckTractorNoInputField = document.querySelector('#truckTractorNo');
        if (truckTractorNoInputField) {
            showModalFlash('Truck / Tractor No. is required before generating a PDF.');
            truckTractorNoInputField.focus();
            field.classList.add('input--error');
            field.addEventListener('input', () => {
                field.classList.remove('input--error');
                clearModalFlash(); // ← clears as soon as they start typing
            }, { once: true });
            return null;
        }
    }
    
    let sanitizedUserInspectionObject = {
        ...userInspectionObject,
        truckTractorNo: truckNo,
        trailerNo: sanitizeText(userInspectionObject.trailerNo),
        remarks: sanitizeText(userInspectionObject.remarks),
        mechanicDate: sanitizeText(userInspectionObject.mechanicDate),
        driverDate: sanitizeText(userInspectionObject.driverDate)
    }

    return sanitizedUserInspectionObject;
}

/**************************************************************
 * decodeHTMLEntities
 * This function takes in the string from sanitizedUserInspectionObject.remarks, 
 * decodes any HTML entities ("&amp;"" -> "&") into a detached <textarea> element, and returns the string
 * There is no XSS risk because the detached element is never inserted into the live DOM.
***************************************************************/
function decodeHTMLEntities(remarks) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = remarks;
    return textArea.value;
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
* 8. A function that stamps an 'X' when the user input evaluates as true, on given coordinates
* 9. I use optional chaining to determine if the sanitizedUserInspectionObject contains any true property-values within the defects property
* 10. I call the xMark function to populate an 'X' on given coordinates
* 11. Converts string 'true' to boolean, checkboxes stay as strings. readFormData returns string 'true' for checkboxes.
* 12. I determine if the input field(s) for driver/mechanic date contains a value, and populate the value as a string
    * This is different from the date from step 7. These dates exist near the bottom of the Driver's Vehicle Inspection Report
* 13. I determine if sanitizedUserInspectionObject.remarks type is a string
    * If it is a string, I call the decodeHTMLEntities function and pass the string in as an argument
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
    // 7 
    driverVehicleInspectionReport.text(String(sanitizedUserInspectionObject.date || ''), 30, 41);
    driverVehicleInspectionReport.text(String(sanitizedUserInspectionObject.truckTractorNo || ''), 60, 50);
    driverVehicleInspectionReport.text(String(sanitizedUserInspectionObject.trailerNo || ''), 55, 150);
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
        driverVehicleInspectionReport.text(String(sanitizedUserInspectionObject.mechanicDate), 165, 257);
    }
    if (sanitizedUserInspectionObject.driverDate) {
        driverVehicleInspectionReport.text(String(sanitizedUserInspectionObject.driverDate), 165, 266);
    }

    // 13
    const remarksRaw = typeof sanitizedUserInspectionObject.remarks === 'string' ? decodeHTMLEntities(sanitizedUserInspectionObject.remarks) : '';
    const remarksLines = driverVehicleInspectionReport.splitTextToSize(remarksRaw, 160);
    if (remarksLines.length > 0) {
        driverVehicleInspectionReport.text(remarksLines, 30, 190);
    }

    window.open(driverVehicleInspectionReport.output('bloburl'));
    return driverVehicleInspectionReport;
}

/**
 * Hero canvas: floating "p" / "q" letters that bounce inside the hero (pretriq brand nod).
 * Skipped when the canvas is missing or the user prefers reduced motion.
 */
function initHeroLetterBounceCanvas() {
    const canvas = document.getElementById('hero-particles');
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
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    const inspectionBtn = document.querySelector('#startInspectionBtn');
    const submitInspectionBtn = document.querySelector('#submitInspectionBtn');
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
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
            closeModal();
        }
    });
    
    // When submitInspectionBtn button is clicked, add an id & createdAt property with dot notation
    if (submitInspectionBtn) {
        submitInspectionBtn.addEventListener('click', async () => {
            // Iterate through the inputs & generate an object
            const userInspectionObject = readFormData();
            // Mutate the strings on the object and create a new object
            const sanitizedUserInspectionObject = validateAndSanitize(userInspectionObject);
            // If an object is not sanitized & validated, stop
            if (!sanitizedUserInspectionObject) return;

            // Use dot notation to create metadata
            sanitizedUserInspectionObject.id = Date.now().toString();
            sanitizedUserInspectionObject.createdAt = new Date().toISOString();

            closeModal();

            // Variable will store PDF
            let userInspectionReport = null;
            try {
                // Call generateDVIRPDF and pass (sanitized w/ metadata) object as an argument
                userInspectionReport = await generateDVIRPDF(sanitizedUserInspectionObject);
            } catch {
                return;
            }
          
            // Display popup 
        })
    }
    // Modal behavior end

    initHeroLetterBounceCanvas();
});