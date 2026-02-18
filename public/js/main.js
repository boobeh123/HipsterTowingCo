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

* 1. We iterate through the form submitted by the user. Logging the value returns:
2/17/2026 1234567 true 1234567 true Hello world <empty string> <empty string>
* 2. We iterate through the form submitted by the user. Logging the key reurns:
date truckTractorNo defects[truckTractor][steering]* trailerNo defects[trailer][brakes]* remarks mechanicDate driverDate
* defects is an object and we are using bracket notation to access the object 
***************************************************************/
function readFormData() {
    const formData = new FormData(form);
    const data = {};
    
    // 1. value - 2. key
    formData.forEach((value, key) => {
        const hasBrackets = key.includes('[');
        const keys = key.split('[').map((element, index) => element.replace(']', ''));

        if (hasBrackets) {
            keys.forEach((element, index) => {
            })
        }

    })

}

document.addEventListener('DOMContentLoaded', () => {
    
    const inspectionBtn = document.querySelector('#startInspectionBtn');
    const submitInspectionBtn = document.querySelector('#submitInspectionBtn');
    const cancelInspetionBtn = document.querySelector('#cancelInspectionBtn')

    // Modal behavior 39-66
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
            const raw = readFormData();
            // alert('hello world - come back later')
            console.log(`sib: ${raw}`); // Output - Undefined
        })
    }
    
})