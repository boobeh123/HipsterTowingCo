// Live search dashboard
if (window.location.pathname === '/todos') {
    console.log('Live search script loaded');
    const searchInput = document.getElementById('search');
    const inspectionList = document.getElementById('inspection-list');
    let debounceTimeout;

    function renderInspections(inspections) {
        if (!inspectionList) {
            console.log('Inspection list not found');
            return;
        }
        if (!inspections.length) {
            inspectionList.innerHTML = '<li class="center-align">No inspections found.</li>';
            return;
        }
        inspectionList.innerHTML = inspections.map(el => {
            const badge = el.conditionSatisfactory
                ? '<span class="new badge green" data-badge-caption="Vehicle OK"><span class="sr-only">Vehicle OK</span></span>'
                : '<span class="new badge red" data-badge-caption="Defects Found"><span class="sr-only">Defects Found</span></span>';
            const trailer = el.trailerNo ? `<span class="grey-text"> / Trailer #${el.trailerNo}</span>` : '';
            const date = new Date(el.createdAt).toLocaleString();
            return `
                <li class="todoItem" data-id="${el._id}" role="listitem">
                    <div class="collapsible-header inspection-header-flex" id="inspection-header-${el._id}" aria-labelledby="inspection-header-${el._id}">
                        <div class="inspection-header-flex1">${badge}</div>
                        <div class="inspection-header-flex3">
                            <span class="bold">USDOT# ${el.truckTractorNo}</span>${trailer}
                        </div>
                        <div class="inspection-header-flex2 right-align grey-text">${date}</div>
                    </div>
                    <div class="collapsible-body inspection-body-padding">
                        <section class="row marginB">
                            <div class="col s12">
                                <h3 class="border-bottom inspection-section-title">Remarks</h3>
                                <p>${el.remarks || 'No remarks provided.'}</p>
                            </div>
                        </section>
                        <div class="right-align">
                            <a href="/todos/view/${el._id}" class="btn-small waves-effect waves-light blue fullReportBtn" aria-label="View full report for inspection ${el.truckTractorNo}">View Full Report</a>
                            <form action="/todos/${el._id}?_method=DELETE" method="POST" class="form-inline" style="display:inline;">
                                <button type="submit" class="btn-small waves-effect waves-light red accent-3" aria-label="Delete inspection for ${el.truckTractorNo}">Delete</button>
                            </form>
                        </div>
                    </div>
                </li>
            `;
        }).join('');
        if (window.M && window.M.Collapsible) {
            M.Collapsible.init(document.querySelectorAll('.collapsible'));
        }
    }

    if (searchInput) {
        console.log('Search input found, adding event listener');
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimeout);
            const q = this.value.trim();
            console.log('Search query:', q);
            
            if (q.length === 0) {
                // If search is empty, reload the page to show all results
                window.location.href = '/todos';
                return;
            }
            
            debounceTimeout = setTimeout(() => {
                console.log('Sending search request for:', q);
                fetch(`/todos/search?q=${encodeURIComponent(q)}`)
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        console.log('Search results:', data);
                        renderInspections(data.inspections || []);
                    })
                    .catch(error => {
                        console.error('Search error:', error);
                        inspectionList.innerHTML = '<li class="center-align red-text">Error loading search results.</li>';
                    });
            }, 300);
        });
    } else {
        console.log('Search input not found');
    }
}

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

                const isAuthenticated = window.location.pathname !== '/';
                
                // Prepare guest inspection data
                const newInspection = {
                    ...data,
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString()
                };
                
                if (!isAuthenticated) {
                    // Validate required fields for guest users
                    if (!data.truckTractorNo || data.truckTractorNo.trim().length === 0) {
                        M.toast({html: 'Please enter the USDOT # before submitting.', classes: 'red'});
                        truckTractorNoInput.focus();
                        return;
                    }
                    
                    // Sanitize text inputs to prevent XSS
                    if (data.remarks) {
                        data.remarks = data.remarks.replace(/[<>]/g, '').trim();
                    }
                    if (data.truckTractorNo) {
                        data.truckTractorNo = data.truckTractorNo.replace(/[<>]/g, '').trim();
                    }
                    if (data.trailerNo) {
                        data.trailerNo = data.trailerNo.replace(/[<>]/g, '').trim();
                    }
                    
                    // Check localStorage size limit (usually 5-10MB)
                    const existingInspections = JSON.parse(localStorage.getItem('guestInspections') || '[]');
                    const estimatedSize = JSON.stringify([...existingInspections, newInspection]).length;
                    if (estimatedSize > 5000000) { // 5MB limit
                        M.toast({html: 'Storage limit reached. Please create an account to save more inspections.', classes: 'orange'});
                        return;
                    }
                }

                if (isAuthenticated) {
                    // /createInspection POST request from dashboard
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
                            gtag('event', 'inspection_submitted', {
                                'truck_number': data.truckTractorNo,
                                'has_defects': !data.conditionSatisfactory
                            });
                            setTimeout(() => {
                                window.location.reload();
                            }, 1750); 
                        } else {
                            M.toast({html: result.message || 'Error submitting inspection.', classes: 'red'});
                            gtag('event', 'inspection_error', {
                                'error_message': result.message || 'Error submitting inspection'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error submitting inspection form:', error);
                        M.toast({html: error.message || 'An error occurred. Please try again.', classes: 'red'});
                    });
                } else {
                    // if not authenticated
                    const guestInspection = newInspection;

                    const existingInspections = JSON.parse(localStorage.getItem('guestInspections') || '[]');
                    existingInspections.push(guestInspection);
                    localStorage.setItem('guestInspections', JSON.stringify(existingInspections));
                    
                    gtag('event', 'guest_inspection_submitted', {
                        'truck_number': guestInspection.truckTractorNo,
                        'has_defects': !guestInspection.conditionSatisfactory,
                        'user_type': 'guest',
                        'inspection_id': guestInspection.id
                    });
                    
                    inspectionModal.close();
                    confetti({
                        particleCount: 300,
                        spread: 120,
                        origin: { y: 0.5 }
                    });
                    
                    showGuestInspectionPopup(guestInspection);
                }
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
    AOS.init();

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

    // Contact Form AJAX
    const contactForm = document.getElementById('contact-form');
    const contactMessage = document.getElementById('contact-message');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contact-name').value.trim(),
                email: document.getElementById('contact-email').value.trim(),
                subject: document.getElementById('contact-subject').value.trim(),
                message: document.getElementById('contact-messageBox').value.trim()
            };

            // Basic validation
            if (!formData.name || !formData.email || !formData.subject || !formData.message) {
                contactMessage.innerHTML = '<span class="red-text">Please fill in all fields.</span>';
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                contactMessage.innerHTML = '<span class="red-text">Please enter a valid email address.</span>';
                return;
            }

            try {
                const res = await fetch('/contact/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if (res.ok) {
                    contactMessage.innerHTML = '<span class="green-text">Thank you for your message! We\'ll get back to you soon.</span>';
                    contactForm.reset();
                    gtag('event', 'contact_form_submitted', {
                        'form_location': 'homepage',
                        'subject': formData.subject
                    });
                } else {
                    const text = await res.text();
                    contactMessage.innerHTML = `<span class="red-text">Error: ${text || 'Could not send message.'}</span>`;
                    gtag('event', 'contact_form_error', {
                        'error_message': text || 'Could not send message'
                    });
                }
            } catch (err) {
                contactMessage.innerHTML = '<span class="red-text">Error: Could not send message. Please try again.</span>';
                gtag('event', 'contact_form_error', {
                    'error_message': 'Network error'
                });
            }
        });
    }

    const pdfBtn = document.getElementById('open-dvir-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async function() {
            const pdf = await generateDVIRPDF(window.inspectionData, true); // true = don't auto-open
            const blobUrl = pdf.output('bloburl');
            if (isMobile()) {
                // Official pdf button functionality for mobile - download pdf
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'inspection-report.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                // Official pdf button functionality for desktop - view new image
                window.open(blobUrl);
            }
        });
    }

    // Profile picture AJAX upload with preloader and toast
    const profilePicForm = document.getElementById('profile-pic-form');
    if (profilePicForm) {
        profilePicForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('upload-btn');
            const btnText = document.getElementById('upload-btn-text');
            const preloader = document.getElementById('upload-preloader');
            btn.disabled = true;
            btnText.style.display = 'none';
            preloader.style.display = 'inline-block';

            const formData = new FormData(profilePicForm);
            try {
                const res = await fetch('/profile', {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Update the profile image if a new one is returned
                    if (data.imageUrl) {
                        const img = document.querySelector('.profile-main img.circle');
                        if (img) img.src = data.imageUrl;
                    }
                    M.toast({html: 'Profile photo updated!', classes: 'green'});
                    profilePicForm.reset();
                } else {
                    const text = await res.text();
                    M.toast({html: text || 'Error uploading photo.', classes: 'red'});
                    profilePicForm.reset();

                }
            } catch (err) {
                M.toast({html: 'Error uploading photo.', classes: 'red'});
            } finally {
                btn.disabled = false;
                btnText.style.display = '';
                preloader.style.display = 'none';
            }
        });
    }

    // Profile picture file input validation
    const fileInput = document.getElementById('profile-file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Check file type
                if (!file.type.startsWith('image/')) {
                    M.toast({html: 'Please select an image file.', classes: 'red'});
                    this.value = '';
                    return;
                }
                // Check file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    M.toast({html: 'Image must be less than 10MB.', classes: 'red'});
                    this.value = '';
                    return;
                }
            }
        });
    }

    // Parallax 
    const heroImg = document.querySelector('.hero-img');
    if (heroImg) {
        heroImg.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * 32; 
            const rotateY = ((x - centerX) / centerX) * 16;
            this.style.transform = `rotateX(${rotateX}deg) rotateY(${-rotateY}deg) scale(1.04)`;
            this.style.transition = 'transform 0.1s';
        });
        heroImg.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.transition = 'transform 0.5s';
        });
        heroImg.addEventListener('mouseenter', function() {
            this.style.transition = 'transform `0.2`s';
        });
    }

    // Canvas
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Particle setup
    const chars = ['p', 'q'];
    const particles = Array.from({length: 24}, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2 + Math.random() * 2,
        dx: (Math.random() - 0.5) * 0.7,
        dy: (Math.random() - 0.5) * 0.7,
        alpha: 0.15 + Math.random() * 0.40,
        color: ['#66bb6a', '#42a5f5', '#ffd600'][Math.floor(Math.random()*3)],
        char: chars[Math.floor(Math.random()*chars.length)]
    }));

    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > w) p.dx *= -1;
            if (p.y < 0 || p.y > h) p.dy *= -1;
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.font = `${p.r * 7}px 'Roboto', Arial, sans-serif`;
            ctx.fillStyle = p.color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(p.char, p.x, p.y);
            ctx.restore();
        }
        requestAnimationFrame(animate);
    }
    animate();
});

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function generateDVIRPDF(data, skipOpen) {
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
    const remarks = typeof data.remarks === 'string' ? decodeHTMLEntities(data.remarks) : '';
    const remarksLines = pdf.splitTextToSize(remarks, 160);
    if (Array.isArray(remarksLines) && remarksLines.length > 0) {
        pdf.text(remarksLines, 30, 190);
    }

    if (!skipOpen) {
        window.open(pdf.output('bloburl'));
    }
    return pdf;
}

// Displays escaped user input on PDF
function decodeHTMLEntities(text) {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
}

// Show popup for guest inspection completion
function showGuestInspectionPopup(inspectionData) {
    // Create popup HTML
    const popupHTML = `
        <div id="guest-inspection-popup" class="modal" style="display: block; z-index: 1003; margin-top: 2rem;" role="dialog" aria-labelledby="guest-popup-title" aria-describedby="guest-popup-description" aria-modal="true">
            <div class="modal-content" style="position: relative;">
                <button id="close-guest-popup" class="btn-flat waves-effect" style="position: absolute; top: 10px; right: 10px; z-index: 1;" aria-label="Close this dialog">
                    <i class="material-icons">close</i>
                </button>
                <h4 id="guest-popup-title" class="green-text"><span class="green-text" style="padding-right: 5px;">✓</span>Inspection Report Generated!</h4>
                <div id="guest-popup-description">
                    <p>Your inspection report has been created successfully. Guest inspection reports <b>are not saved to our servers</b> - please download the PDF to keep your report.</p>
                    <p><strong>Consider creating an account to store future documents and access your inspection history.</strong></p>
                </div>
                <div class="modal-footer" role="group" aria-label="Action buttons" style="display: flex; justify-content: space-evenly; border-bottom: 1px solid gray; border-top: 1px solid gray;">
                    <button id="download-guest-pdf" class="btn waves-effect waves-light green" aria-label="Download inspection report as PDF">
                        <i class="material-icons left" aria-hidden="true">download</i>
                        Download PDF
                    </button>
                    <a href="/signup" class="btn waves-effect waves-light blue" role="button" aria-label="Create a new account to save future reports">
                        <i class="material-icons left" aria-hidden="true">person_add</i>
                        Create Account
                    </a>
                </div>
            </div>
        </div>
        <div class="modal-overlay" style="display: block; z-index: 1002; background-color: rgba(0, 0, 0, 0.5); opacity: 1;" role="presentation" aria-hidden="true"></div>
    `;
    
    // Add popup to page
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Add event listeners
    document.getElementById('download-guest-pdf').addEventListener('click', async function() {
        try {
            const pdf = await generateDVIRPDF(inspectionData, true);
            const blobUrl = pdf.output('bloburl');
            
            if (isMobile()) {
                // Download for mobile
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `inspection-report-${inspectionData.truckTractorNo}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                // Open in new tab for desktop
                window.open(blobUrl);
            }
            
            // Track PDF download
            gtag('event', 'guest_pdf_downloaded', {
                'truck_number': inspectionData.truckTractorNo,
                'user_type': 'guest',
                'inspection_id': inspectionData.id,
                'device_type': isMobile() ? 'mobile' : 'desktop'
            });
            
            M.toast({html: 'PDF downloaded successfully!', classes: 'green'});
        } catch (error) {
            console.error('Error generating PDF:', error);
            M.toast({html: 'Error generating PDF. Please try again.', classes: 'red'});
            
            // Track PDF error
            gtag('event', 'guest_pdf_error', {
                'error_message': error.message,
                'truck_number': inspectionData.truckTractorNo,
                'user_type': 'guest'
            });
        }
    });
    
    document.getElementById('close-guest-popup').addEventListener('click', function() {
        // Track popup close
        gtag('event', 'guest_popup_closed', {
            'truck_number': inspectionData.truckTractorNo,
            'user_type': 'guest',
            'inspection_id': inspectionData.id
        });
        
        const popup = document.getElementById('guest-inspection-popup');
        const overlay = document.querySelector('.modal-overlay');
        if (popup) popup.remove();
        if (overlay) overlay.remove();
    });
    
    // Close popup when clicking overlay
    document.querySelector('.modal-overlay').addEventListener('click', function() {
        // Track popup close via overlay
        gtag('event', 'guest_popup_closed_overlay', {
            'truck_number': inspectionData.truckTractorNo,
            'user_type': 'guest',
            'inspection_id': inspectionData.id
        });
        
        const popup = document.getElementById('guest-inspection-popup');
        const overlay = document.querySelector('.modal-overlay');
        if (popup) popup.remove();
        if (overlay) overlay.remove();
    });
}