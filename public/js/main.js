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
                        // Track successful inspection submission
                        gtag('event', 'inspection_submitted', {
                            'truck_number': data.truckTractorNo,
                            'has_defects': !data.conditionSatisfactory
                        });
                        // Reload the page to show the new inspection
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000); 
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
});
