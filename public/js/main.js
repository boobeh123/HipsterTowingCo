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



document.addEventListener('DOMContentLoaded', () => {
    
    const inspectionBtn = document.querySelector('#startInspectionBtn');
    const submitInspectionBtn = document.querySelector('#submitInspectionBtn');

    if (inspectionBtn) {
        inspectionBtn.addEventListener('click', openModal);
    }

    if (submitInspectionBtn) {
        submitInspectionBtn.addEventListener('click', () => {
            alert('hello world - come back later');

        })
    }


})