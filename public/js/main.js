document.addEventListener('DOMContentLoaded', function() {
    // Check if the inspection modal exists on the page before trying to initialize it
    const inspectionModalEl = document.getElementById('inspectionModal');
    if (inspectionModalEl) {
        const inspectionModal = M.Modal.init(inspectionModalEl);
        const startInspectionBtn = document.getElementById('startInspectionBtn');
        if (startInspectionBtn) {
            startInspectionBtn.addEventListener('click', () => {
                const dateField = document.getElementById('date');
                if(dateField){
                    const today = new Date();
                    const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
                    dateField.value = formattedDate;
                    M.updateTextFields(); // Ensure Materialize label moves up for the disabled field
                }
                inspectionModal.open();
            });
        }
        
        // Handle form submission
        const submitInspectionBtn = document.getElementById('submitInspection');
        if (submitInspectionBtn) {
            submitInspectionBtn.addEventListener('click', function() {
                const form = document.getElementById('inspectionForm');
                if (!form) return;

                // --- Custom Validation ---
                const truckTractorNoInput = document.getElementById('truckTractorNo');
                if (!truckTractorNoInput.value.trim()) {
                    M.toast({html: 'Please enter the USDOT # before submitting.', classes: 'red'});
                    truckTractorNoInput.focus();
                    return; 
                }

                const formData = new FormData(form);
                
                // Convert FormData to a structured JSON object
                const data = {};
                formData.forEach((value, key) => {
                    // This regex handles nested keys like 'defects[truckTractor][airCompressor]'
                    const keys = key.match(/[^\[\]]+/g);
                    if (keys && keys.length > 1) {
                        let current = data;
                        keys.forEach((k, i) => {
                            if (i === keys.length - 1) {
                                // Convert checkbox 'true' string to boolean, but keep other string values
                                current[k] = value === 'true' ? true : (value === '' ? null : value);
                            } else {
                                current[k] = current[k] || {};
                                current = current[k];
                            }
                        });
                    } else {
                        data[key] = value;
                    }
                });

                // Submit form to the dedicated endpoint for authenticated users
                fetch('/todos/createInspection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw new Error(err.message || 'Server error') });
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.success) {
                        inspectionModal.close();
                        M.toast({html: 'Inspection submitted successfully!', classes: 'green'});
                        // Reload the page to show the new inspection
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000); 
                    } else {
                        M.toast({html: result.message || 'Error submitting inspection.', classes: 'red'});
                    }
                })
                .catch(error => {
                    console.error('Error submitting inspection form:', error);
                    M.toast({html: error.message || 'An error occurred. Please try again.', classes: 'red'});
                });
            });
        }
    }

    // Initialize all Materialize components on the page
    const selects = document.querySelectorAll('select');
    if (selects.length > 0) {
        M.FormSelect.init(selects);
    }
    const sidenav = document.querySelector('.sidenav');
    if (sidenav) {
        M.Sidenav.init(sidenav);
    }
    const slider = document.querySelector('.slider');
    if (slider) {
        M.Slider.init(slider);
    }
    const collapsibles = document.querySelectorAll('.collapsible');
    if (collapsibles.length > 0) {
        M.Collapsible.init(collapsibles);
    }
});
