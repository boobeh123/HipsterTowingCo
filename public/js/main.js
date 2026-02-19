const overlay = document.querySelector('#inspectionOverlay');
const form = document.querySelector('#inspectionForm');

function openModal() {
    const dateField = document.querySelector('#date');
    const truckTractorNoInputField = document.querySelector('#truckTractorNo');

    if (dateField) {
        const todaysDate = new Date();
        dateField.value = `${todaysDate.getMonth() + 1}/${todaysDate.getDate()}/${todaysDate.getFullYear()}`;   // Month/Day/Year
    }
    overlay.classList.add('is-open');

    // if (truckTractorNoInputField) {
        // truckTractorNoInputField.focus();
    // }

}

function closeModal() {
    overlay.classList.remove('is-open');

    if (form) {
        form.reset();
    }
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

function validateAndSanitize(userInspectionObject) {
    alert('hello world');
}

document.addEventListener('DOMContentLoaded', () => {
    
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
        if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
            closeModal();
        }
    })
    
    if (submitInspectionBtn) {
        submitInspectionBtn.addEventListener('click', async () => {
            const userInspectionObject = readFormData();
            const data = validateAndSanitize(userInspectionObject);
        })
    }
    // Modal behavior end
    
})