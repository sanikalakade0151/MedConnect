/**
 * ==========================================================================
 * MEDCONNECT – Prescription Upload & OCR Controller (prescriptions.js)
 * Real File Selection, Drag & Drop, OCR Processing, User Verification
 * ==========================================================================
 */

let selectedFile = null;
let currentOcrResult = null;

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();

    // Check if on upload page or list page
    const dropzone = document.getElementById('prescription-dropzone');
    const fileInput = document.getElementById('prescription-file-input');

    if (dropzone && fileInput) {
        setupUploadInteractions(dropzone, fileInput);
    } else {
        loadPrescriptionsList();
    }
});

function setupUploadInteractions(dropzone, fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag & Drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Cancel selected file button
    const cancelFileBtn = document.getElementById('cancel-file-btn');
    if (cancelFileBtn) {
        cancelFileBtn.addEventListener('click', resetFileSelection);
    }

    // Process OCR button
    const processBtn = document.getElementById('process-ocr-btn');
    if (processBtn) {
        processBtn.addEventListener('click', uploadAndProcessOCR);
    }

    // Verify & Save prescription button
    const verifyForm = document.getElementById('ocr-verification-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleSaveVerifiedPrescription);
    }
}

function handleFileSelection(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
        showToast('File type not supported. Please upload JPG, PNG or PDF.', 'error');
        return;
    }

    if (file.size > maxSizeBytes) {
        showToast('File size is too large. Maximum size is 10 MB.', 'error');
        return;
    }

    selectedFile = file;

    // Show preview bar
    const previewBar = document.getElementById('file-preview-bar');
    const fileNameEl = document.getElementById('selected-file-name');
    const fileSizeEl = document.getElementById('selected-file-size');

    if (previewBar && fileNameEl && fileSizeEl) {
        fileNameEl.innerText = file.name;
        fileSizeEl.innerText = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        previewBar.style.display = 'flex';
    }

    const processBtn = document.getElementById('process-ocr-btn');
    if (processBtn) processBtn.disabled = false;
}

function resetFileSelection() {
    selectedFile = null;
    const fileInput = document.getElementById('prescription-file-input');
    if (fileInput) fileInput.value = '';
    const previewBar = document.getElementById('file-preview-bar');
    if (previewBar) previewBar.style.display = 'none';
    const processBtn = document.getElementById('process-ocr-btn');
    if (processBtn) processBtn.disabled = true;
    const resultsWrapper = document.getElementById('ocr-results-wrapper');
    if (resultsWrapper) resultsWrapper.style.display = 'none';
}

async function uploadAndProcessOCR() {
    if (!selectedFile) {
        showToast('Please select a prescription file.', 'warning');
        return;
    }

    const processBtn = document.getElementById('process-ocr-btn');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-fill');

    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning with OCR...';
    if (progressContainer) progressContainer.style.display = 'block';

    // Simulate progress animation
    let progress = 20;
    const progressInterval = setInterval(() => {
        progress += 15;
        if (progress > 85) clearInterval(progressInterval);
        if (progressBar) progressBar.style.width = `${progress}%`;
    }, 200);

    const formData = new FormData();
    formData.append('prescription', selectedFile);

    try {
        const response = await fetch(`${API_BASE}/prescriptions/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MedAuth.getToken()}`
            },
            body: formData
        });

        clearInterval(progressInterval);
        if (progressBar) progressBar.style.width = '100%';

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || 'Prescription scan failed.', 'error');
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Medicines with OCR';
            return;
        }

        currentOcrResult = data;
        showToast('OCR extraction complete! Please verify details.', 'success');
        displayOCRResults(data);

    } catch (err) {
        clearInterval(progressInterval);
        showToast('Error uploading prescription.', 'error');
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Extract Medicines with OCR';
    }
}

function displayOCRResults(data) {
    const wrapper = document.getElementById('ocr-results-wrapper');
    if (!wrapper) return;

    wrapper.style.display = 'grid';

    // Display raw OCR text
    const rawBox = document.getElementById('ocr-raw-text');
    if (rawBox) {
        rawBox.innerText = data.raw_text || 'No text extracted.';
    }

    // Populate extracted medicines table
    const tableBody = document.getElementById('ocr-medicines-tbody');
    if (tableBody) {
        const meds = data.extracted_medicines || [];
        if (meds.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 1.5rem;">No specific medicine names identified. You can browse the catalog.</td></tr>`;
        } else {
            tableBody.innerHTML = meds.map((m, idx) => `
                <tr>
                    <td><strong style="color: var(--primary); font-size: 0.95rem;">${m.name}</strong></td>
                    <td>${m.dosage || 'Standard'}</td>
                    <td>${m.frequency || 'Once daily'}</td>
                    <td>${m.duration || '5 days'}</td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                            <button type="button" class="btn btn-primary btn-sm" onclick="addSinglePrescribedToCart('${m.name.replace(/'/g, "\\'")}', this)" title="Add directly to cart">
                                <i class="fa-solid fa-cart-plus"></i> Add to Cart
                            </button>
                            <a href="medicines.html?search=${encodeURIComponent(m.name)}" target="_blank" class="btn btn-outline btn-sm" title="View medicine details in catalog">
                                <i class="fa-solid fa-magnifying-glass"></i> View
                            </a>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Populate verification doctor/patient fields if found
    if (document.getElementById('verify-doctor-name')) {
        document.getElementById('verify-doctor-name').value = data.doctor_name || '';
    }
    if (document.getElementById('verify-patient-name')) {
        document.getElementById('verify-patient-name').value = data.patient_name || MedAuth.getUser()?.name || '';
    }
}

async function addSinglePrescribedToCart(medName, btn) {
    if (!MedAuth.isAuthenticated()) {
        showToast('Please login to add to cart.', 'warning');
        return;
    }

    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        const res = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ medicine_name: medName, quantity: 1 })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`${medName} added to cart!`, 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-primary');
                    btn.disabled = false;
                }, 1500);
            }
        } else {
            showToast(data.message || `Could not find ${medName} in catalog.`, 'error');
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    } catch (e) {
        showToast('Network error adding to cart.', 'error');
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}

async function addAllPrescribedToCart() {
    if (!currentOcrResult || !currentOcrResult.extracted_medicines || currentOcrResult.extracted_medicines.length === 0) {
        showToast('No extracted medicines found.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-add-all-prescribed');
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding all...';
    }

    const items = currentOcrResult.extracted_medicines.map(m => ({
        name: m.name,
        quantity: 1
    }));

    try {
        const res = await fetch(`${API_BASE}/cart/add-batch`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ items })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || 'All prescribed medicines added to cart!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check-double"></i> All Added to Cart!';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
            }
        } else {
            showToast(data.message || 'Failed to add items.', 'error');
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    } catch (e) {
        showToast('Network error adding medicines.', 'error');
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}

async function addExtractedListToCart(medicines, btn) {
    if (!medicines || medicines.length === 0) return;
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    const items = medicines.map(m => ({ name: m.name, quantity: 1 }));
    try {
        const res = await fetch(`${API_BASE}/cart/add-batch`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ items })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || 'Prescribed medicines added to cart!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
            }
        } else {
            showToast(data.message || 'Failed to add medicines.', 'error');
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    } catch (e) {
        showToast('Network error.', 'error');
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}

async function handleSaveVerifiedPrescription(e) {
    e.preventDefault();

    if (!currentOcrResult) {
        showToast('Please scan a prescription first.', 'warning');
        return;
    }

    const doctorName = document.getElementById('verify-doctor-name').value.trim();
    const patientName = document.getElementById('verify-patient-name').value.trim();
    const notes = document.getElementById('verify-notes') ? document.getElementById('verify-notes').value.trim() : '';

    const payload = {
        prescription_id: currentOcrResult.prescription_id,
        doctor_name: doctorName,
        patient_name: patientName,
        extracted_medicines: currentOcrResult.extracted_medicines,
        notes: notes,
        verified_by_user: true
    };

    try {
        const res = await fetch(`${API_BASE}/prescriptions/verify`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ ...payload })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Prescription verified and saved successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'prescriptions.html';
            }, 1200);
        } else {
            showToast(data.message || 'Could not verify prescription.', 'error');
        }
    } catch (err) {
        showToast('Network error saving prescription.', 'error');
    }
}

// Prescriptions List View Controller
async function loadPrescriptionsList() {
    const container = document.getElementById('prescriptions-grid-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/prescriptions`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load prescriptions.', 'error');
            return;
        }

        const list = data.prescriptions || [];

        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state card" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-file-prescription empty-icon"></i>
                    <h3>No Prescriptions Uploaded</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Upload doctor prescriptions to quickly order Rx-required medicines.</p>
                    <a href="upload-prescription.html" class="btn btn-primary">Upload Prescription Now</a>
                </div>
            `;
            return;
        }

        container.innerHTML = list.map(p => {
            const medList = p.extracted_medicines || [];
            return `
            <div class="prescription-card">
                <div class="prescription-thumb">
                    ${p.file_path && p.file_path.toLowerCase().endsWith('.pdf') ? 
                        `<i class="fa-solid fa-file-pdf pdf-icon"></i>` : 
                        `<img src="${p.file_url || '/uploads/prescriptions/' + (p.filename || '')}" alt="Prescription" onerror="this.src='https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'">`
                    }
                </div>
                <div class="prescription-body">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="font-size: 1.05rem; font-weight: 700;">${p.doctor_name ? 'Dr. ' + p.doctor_name : 'Prescription #' + (p._id ? p._id.substring(0, 6) : '')}</h4>
                        <span class="badge ${p.status === 'Verified' ? 'badge-success' : 'badge-warning'}">${p.status || 'Verified'}</span>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                        Uploaded: ${p.uploaded_at || 'Recently'}<br>
                        Patient: ${p.patient_name || 'Self'}
                    </p>

                    ${medList.length > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Prescribed Medicines:</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
                                ${medList.map(m => `
                                    <a href="medicines.html?search=${encodeURIComponent(m.name)}" class="badge badge-primary" style="text-decoration: none; font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Click to view in catalog">
                                        <i class="fa-solid fa-magnifying-glass"></i> ${m.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; gap: 0.5rem;">
                        <button class="btn btn-outline btn-sm" onclick="deletePrescription('${p._id}')">
                            <i class="fa-regular fa-trash-can"></i> Delete
                        </button>
                        ${medList.length > 0 ? `
                            <button class="btn btn-primary btn-sm" onclick="addExtractedListToCart(${JSON.stringify(medList).replace(/"/g, '&quot;')}, this)">
                                <i class="fa-solid fa-cart-plus"></i> Add to Cart
                            </button>
                        ` : `
                            <a href="medicines.html?prescription_required=true" class="btn btn-primary btn-sm">
                                <i class="fa-solid fa-cart-plus"></i> View Rx Meds
                            </a>
                        `}
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error fetching prescriptions:', err);
    }
}

async function deletePrescription(id) {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    try {
        const res = await fetch(`${API_BASE}/prescriptions/${id}`, {
            method: 'DELETE',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Prescription deleted.', 'info');
            loadPrescriptionsList();
        } else {
            showToast('Failed to delete prescription.', 'error');
        }
    } catch (e) {
        showToast('Network error.', 'error');
    }
}
