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
                        confetti({
                            particleCount: 300,
                            spread: 120,
                            origin: { y: 0.5 }
                          });
                        // Track successful inspection submission
                        gtag('event', 'inspection_submitted', {
                            'truck_number': data.truckTractorNo,
                            'has_defects': !data.conditionSatisfactory
                        });
                        // Reload the page to show the new inspection
                        setTimeout(() => {
                            window.location.reload();
                        }, 5000); 
                    } else {
                        M.toast({html: result.message || 'Error submitting inspection.', classes: 'red'});
                        // Track failed submission
                        gtag('event', 'inspection_error', {
                            'error_message': result.message || 'Error submitting inspection'
                        });
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

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async function() {
            let currentPage = parseInt(this.dataset.page, 10);
            const nextPage = currentPage + 1;

            this.textContent = 'Loading...';
            this.disabled = true;

            try {
                const response = await fetch(`/todos/loadmore?page=${nextPage}`);
                if (!response.ok) {
                    throw new Error('Failed to load more inspections.');
                }
                const { inspections, hasMore } = await response.json();
                
                const inspectionList = document.getElementById('inspection-list');
                
                // --- Create a template for new inspection items ---
                const itemsHtml = inspections.map(el => `
                    <li class="todoItem" data-id="${el._id}">
                        <div class="collapsible-header valign-wrapper" style="display: flex; justify-content: space-between;">
                            <div style="flex: 1;">
                                ${el.conditionSatisfactory 
                                    ? '<span class="new badge green" data-badge-caption="Vehicle OK"></span>' 
                                    : '<span class="new badge red" data-badge-caption="Defects Found"></span>'}
                            </div>
                            <div style="flex: 3;">
                                <span class="bold">USDOT# ${el.truckTractorNo}</span>
                                ${el.trailerNo ? `<span class="grey-text"> / Trailer # ${el.trailerNo}</span>` : ''}
                            </div>
                            <div style="flex: 2;" class="right-align grey-text">
                                ${new Date(el.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="collapsible-body" style="padding: 2rem;">
                            <!-- Body content would be more complex to recreate fully without Moment.js, keeping it simple for now -->
                            <p><b>Remarks:</b> ${el.remarks || 'No remarks provided.'}</p>
                            <div class="right-align">
                                <a href="/todos/view/${el._id}" class="btn-small waves-effect waves-light blue">View Full Report</a>
                                <form action="/todos/${el._id}?_method=DELETE" method="POST" style="display: inline;">
                                    <button type="submit" class="btn-small waves-effect waves-light red accent-3">Delete</button>
                                </form>
                            </div>
                        </div>
                    </li>
                `).join('');

                inspectionList.insertAdjacentHTML('beforeend', itemsHtml);
                
                // Re-initialize collapsibles for the new items
                const newCollapsibles = inspectionList.querySelectorAll('.collapsible');
                M.Collapsible.init(newCollapsibles);

                // Update button state
                this.dataset.page = nextPage;
                if (hasMore) {
                    this.textContent = 'Load More';
                    this.disabled = false;
                } else {
                    this.textContent = 'No More Inspections';
                    this.style.display = 'none'; // Hide the button
                }

            } catch (error) {
                console.error('Error loading more inspections:', error);
                M.toast({ html: 'Could not load more inspections.', classes: 'red' });
                this.textContent = 'Load More';
                this.disabled = false;
            }
        });
    }

      // Newsletter AJAX
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterMessage = document.getElementById('newsletter-message');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('newsletter-email').value;
      try {
        const res = await fetch('/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) {
          newsletterMessage.innerHTML = '<span class="green-text">Thank you for subscribing!</span>';
          newsletterForm.reset();
          // Track successful newsletter signup
          gtag('event', 'newsletter_signup', {
            'signup_location': 'homepage'
          });
        } else {
          const text = await res.text();
          newsletterMessage.innerHTML = `<span class="red-text">Error: ${text || 'Could not subscribe.'}</span>`;
          // Track failed newsletter signup
          gtag('event', 'newsletter_error', {
            'error_message': text || 'Could not subscribe'
          });
        }
      } catch (err) {
        newsletterMessage.innerHTML = '<span class="red-text">Error: Could not subscribe.</span>';
      }
    });
  }

  const pdfBtn = document.getElementById('open-dvir-pdf');
  if (!pdfBtn) return;

  pdfBtn.addEventListener('click', async function() {
    const date = document.getElementById('inspection-date')?.textContent.trim() || '';
    const truckTractorNo = document.getElementById('inspection-truckNo')?.textContent.trim() || '';
    const trailerNo = document.getElementById('inspection-trailerNo')?.textContent.trim() || '';
    const remarks = document.getElementById('inspection-remarks')?.textContent.trim() || '';
    
    await generateDVIRPDF(window.inspectionData);
  });
});

async function generateDVIRPDF(data) {
  const pdf = new window.jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const defects = data.defects?.truckTractor || {};
  const defectsTrailer = data.defects?.trailer || {};

  const img = new window.Image();
  img.src = '/imgs/dvir-template.png';
  await new Promise(resolve => { img.onload = resolve; });
  pdf.addImage(img, 'PNG', 0, 0, 215.9, 279.4);
 
// Iterates through dimensions (215.9mm x 279.4mm) of Letter size paper to determine where to draw grid lines
//   for (let y = 0; y < 280; y += 10) {
//     pdf.text(`${y}`, 2, y);
//     pdf.line(0, y, 215.9, y);
//   }
//   for (let x = 0; x < 216; x += 10) {
//     pdf.text(`${x}`, x, 5);
//     pdf.line(x, 0, x, 279.4);
//   }

  pdf.setTextColor(0, 0, 0); 
  pdf.setFontSize(12);
  pdf.text(String(data.date || ''), 30, 41);
  pdf.text(String(data.truckTractorNo || ''), 60, 50);
  pdf.text(String(data.trailerNo || ''), 55 , 150);
  // Truck/Tractor Defects (Left column)
  if (defects.airCompressor === true)      pdf.text('X', 13, 58);
  if (defects.airLines === true)           pdf.text('X', 13, 63);
  if (defects.battery === true)            pdf.text('X', 13, 68);
  if (defects.brakeAccessories === true)   pdf.text('X', 13, 73);
  if (defects.brakes === true)             pdf.text('X', 13, 79);
  if (defects.carburetor === true)         pdf.text('X', 13, 84);
  if (defects.clutch === true)             pdf.text('X', 13, 90);
  if (defects.defroster === true)          pdf.text('X', 13, 95);
  if (defects.driveLine === true)          pdf.text('X', 13, 100);
  if (defects.engine === true)             pdf.text('X', 13, 105);
  if (defects.fifthWheel === true)         pdf.text('X', 13, 110);
  if (defects.frontAxle === true)          pdf.text('X', 13, 115);
  if (defects.fuelTanks === true)          pdf.text('X', 13, 120);
  if (defects.heater === true)             pdf.text('X', 13, 126);
  // Truck/Tractor Defects (Middle column)
  if (defects.horn === true)               pdf.text('X', 78, 58);
  if (defects.lights === true)             pdf.text('X', 78, 63);
//   if (defects.headStop === true)           pdf.text('X', 78, 84);
//   if (defects.tailDash === true)           pdf.text('X', 78, 90);
//   if (defects.turnIndicators === true)     pdf.text('X', 78, 95);
  if (defects.mirrors === true)            pdf.text('X', 78, 84);
  if (defects.muffler === true)            pdf.text('X', 78, 90);
  if (defects.oilPressure === true)        pdf.text('X', 78, 95);
  if (defects.onBoardRecorder === true)    pdf.text('X', 78, 100);
  if (defects.radiator === true)           pdf.text('X', 78, 105);
  if (defects.rearEnd === true)            pdf.text('X', 78, 110);
  if (defects.reflectors === true)         pdf.text('X', 78, 115);
  if (defects.safetyEquipment === true)    pdf.text('X', 78, 120);
  // Truck/Tractor Defects (Right column)
  if (defects.springs === true)            pdf.text('X', 143, 57);
  if (defects.starter === true)            pdf.text('X', 143, 62);
  if (defects.steering === true)           pdf.text('X', 143, 68);
  if (defects.tachograph === true)         pdf.text('X', 143, 74);
  if (defects.tires === true)              pdf.text('X', 143, 79);
  if (defects.transmission === true)       pdf.text('X', 143, 84);
  if (defects.wheels === true)             pdf.text('X', 143, 89);
  if (defects.windows === true)            pdf.text('X', 143, 94);
  if (defects.windshieldWipers === true)   pdf.text('X', 143, 99);
  if (defects.other === true)              pdf.text('X', 143, 104);
  // Trailer Defects (Left column)
  if (defectsTrailer.brakeConnections === true) pdf.text('X', 13, 156);
  if (defectsTrailer.brakes === true)           pdf.text('X', 13, 162);
  if (defectsTrailer.couplingChains === true)   pdf.text('X', 13, 167);
  if (defectsTrailer.couplingPin === true)      pdf.text('X', 13, 172);
  if (defectsTrailer.doors === true)            pdf.text('X', 13, 177);
  // Trailer Defects (Middle column)
  if (defectsTrailer.hitch === true)            pdf.text('X', 78, 156);
  if (defectsTrailer.landingGear === true)      pdf.text('X', 78, 162);
  if (defectsTrailer.lightsAll === true)        pdf.text('X', 78, 167);
  if (defectsTrailer.roof === true)             pdf.text('X', 78, 172);
  if (defectsTrailer.springs === true)          pdf.text('X', 78, 177);
  // Trailer Defects (Right column)
  if (defectsTrailer.tarpaulin === true)        pdf.text('X', 143, 155);
  if (defectsTrailer.tires === true)            pdf.text('X', 143, 161);
  if (defectsTrailer.wheels === true)           pdf.text('X', 143, 166);
  if (defectsTrailer.other === true)            pdf.text('X', 143, 171);

  // Safely handle remarks
  const remarks = typeof data.remarks === 'string' ? data.remarks : '';
  const remarksLines = pdf.splitTextToSize(remarks, 160);
  if (Array.isArray(remarksLines) && remarksLines.length > 0) {
    pdf.text(remarksLines, 30, 190);
  }

  window.open(pdf.output('bloburl'));
}