const overlay = document.querySelector('#inspectionOverlay');
const form = document.querySelector('#inspectionForm');

function openModal() {
    const dateField = document.querySelector('#date');
    const truckTractorNoInputField = document.querySelector('#truckTractorNo');

    if (dateField) {
        const todaysDate = new Date();
        // console.log(todaysDate);
        // console.log(todaysDate.getMonth());
        // console.log(todaysDate.getDate());
        // console.log(todaysDate.getDay());
        dateField.value = `${todaysDate.getMonth() + 1}/${todaysDate.getDate()}/${todaysDate.getFullYear()}`;   // Month/Day/Year
        // console.log(`${todaysDate.getMonth() + 1}/${todaysDate.getDate()}/${todaysDate.getFullYear()}`);
    }
    overlay.classList.add('is-open');

    if (truckTractorNoInputField) {
        truckTractorNoInputField.focus();
    }

}

function closeModal() {
    overlay.classList.remove('is-open');

    if (form) {
        form.reset();
    }
}

// checkbox form example: name="defects[truckTractor][brakes]"
function readFormData() {
    const formData = new FormData(form);
    const data = {};
    
    console.log(`rfd: ${formData}`);    // output [object FormData]
    

    formData.forEach((value, key) => {
        
        const hasBrackets = key.includes('[');
        const keys = key.split('[').map((element, index) => element.replace(']', ''));

        console.log(keys)   // Output: [defects, truckTractor, brakes]

        if (hasBrackets) {
            keys.forEach((value, key) => {
                console.log(`the value ${value}`); // Output "defects" "truckTractor" "brakes"
                // console.log(`key length: ${key.length}`);   // undefined
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

            console.log(`sib: ${raw}`); // Output - Undefined
        })
    }
    
})