/**
 * ==========================================================================
 * MEDCONNECT – Medicines Controller (medicines.js)
 * Live Search, Category/Form/Price Filters, Auto-suggestions, Cart/Wishlist
 * ==========================================================================
 */

let searchTimeout = null;
let currentFilters = {
    search: '',
    category: '',
    form: '',
    sort: 'popular',
    prescription: ''
};

document.addEventListener('DOMContentLoaded', () => {
    // Read query params from URL (e.g. from header search or prescription click)
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const catParam = urlParams.get('category');
    const rxParam = urlParams.get('prescription_required') || urlParams.get('rx');
    
    if (searchParam) {
        currentFilters.search = searchParam;
        const searchInput = document.getElementById('medicine-search-input');
        if (searchInput) searchInput.value = searchParam;
    }
    if (catParam) {
        currentFilters.category = catParam;
        const catSelect = document.getElementById('filter-category');
        if (catSelect) catSelect.value = catParam;
    }
    if (rxParam) {
        currentFilters.prescription = rxParam;
        const rxSelect = document.getElementById('filter-rx');
        if (rxSelect) rxSelect.value = rxParam;
        const rxChip = document.getElementById('chip-rx');
        if (rxChip) {
            document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
            rxChip.classList.add('active');
        }
    }

    setupEventListeners();
    fetchMedicines();
});

function selectQuickFilter(type, val = '') {
    document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));

    if (type === 'all') {
        currentFilters.prescription = '';
        currentFilters.category = '';
        currentFilters.search = '';
        const searchInput = document.getElementById('medicine-search-input');
        if (searchInput) searchInput.value = '';
        const catSelect = document.getElementById('filter-category');
        if (catSelect) catSelect.value = '';
        const rxSelect = document.getElementById('filter-rx');
        if (rxSelect) rxSelect.value = '';
        const chip = document.getElementById('chip-all');
        if (chip) chip.classList.add('active');
    } else if (type === 'rx') {
        currentFilters.prescription = 'true';
        const rxSelect = document.getElementById('filter-rx');
        if (rxSelect) rxSelect.value = 'true';
        const chip = document.getElementById('chip-rx');
        if (chip) chip.classList.add('active');
    } else if (type === 'otc') {
        currentFilters.prescription = 'false';
        const rxSelect = document.getElementById('filter-rx');
        if (rxSelect) rxSelect.value = 'false';
        const chip = document.getElementById('chip-otc');
        if (chip) chip.classList.add('active');
    } else if (type === 'cat') {
        currentFilters.category = val;
        const catSelect = document.getElementById('filter-category');
        if (catSelect) catSelect.value = val;
    }

    fetchMedicines();
}

function setupEventListeners() {
    const searchInput = document.getElementById('medicine-search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    const clearBtn = document.getElementById('clear-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            currentFilters.search = val;

            if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

            // Debounced Search & Suggestions
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchSuggestions(val);
                fetchMedicines();
            }, 300);
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
                if (suggestionsBox) suggestionsBox.style.display = 'none';
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentFilters.search = '';
            clearBtn.style.display = 'none';
            if (suggestionsBox) suggestionsBox.style.display = 'none';
            fetchMedicines();
        });
    }

    // Filter controls
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            fetchMedicines();
        });
    }

    const formSelect = document.getElementById('filter-form');
    if (formSelect) {
        formSelect.addEventListener('change', (e) => {
            currentFilters.form = e.target.value;
            fetchMedicines();
        });
    }

    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value;
            fetchMedicines();
        });
    }

    const rxFilter = document.getElementById('filter-rx');
    if (rxFilter) {
        rxFilter.addEventListener('change', (e) => {
            currentFilters.prescription = e.target.value;
            fetchMedicines();
        });
    }
}

// Fetch Search Auto-Suggestions
async function fetchSuggestions(query) {
    const suggestionsBox = document.getElementById('search-suggestions');
    if (!suggestionsBox) return;

    if (!query || query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/medicines/suggestions?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;

        const data = await res.json();
        const suggestions = data.suggestions || [];

        if (suggestions.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        suggestionsBox.innerHTML = suggestions.map(item => `
            <div class="suggestion-item" onclick="selectSuggestion('${item.name}')">
                <div class="suggestion-meta">
                    <h6>${item.name}</h6>
                    <span>${item.generic_name || item.brand_name || ''} • ${item.category}</span>
                </div>
                <span class="badge badge-primary">₹${item.price}</span>
            </div>
        `).join('');

        suggestionsBox.style.display = 'block';

    } catch (e) {
        console.error('Error fetching suggestions:', e);
    }
}

function selectSuggestion(name) {
    const searchInput = document.getElementById('medicine-search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    if (searchInput) searchInput.value = name;
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    currentFilters.search = name;
    fetchMedicines();
}

// Main fetch function for medicine catalog
async function fetchMedicines() {
    const grid = document.getElementById('medicines-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;

    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
            <p style="margin-top: 1rem; color: var(--text-secondary); font-weight: 500;">Searching medicines database...</p>
        </div>
    `;

    try {
        const queryParams = new URLSearchParams();
        if (currentFilters.search) queryParams.set('search', currentFilters.search);
        if (currentFilters.category) queryParams.set('category', currentFilters.category);
        if (currentFilters.form) queryParams.set('form', currentFilters.form);
        if (currentFilters.sort) queryParams.set('sort', currentFilters.sort);
        if (currentFilters.prescription) queryParams.set('prescription_required', currentFilters.prescription);

        const res = await fetch(`${API_BASE}/medicines?${queryParams.toString()}`);
        const data = await res.json();

        const medicines = data.medicines || [];

        if (countEl) {
            countEl.innerText = `Showing ${medicines.length} medicine${medicines.length === 1 ? '' : 's'}`;
        }

        if (medicines.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                    <i class="fa-solid fa-prescription-bottle-medical" style="font-size: 3.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 0.5rem;">No medicines found</h3>
                    <p style="color: var(--text-secondary); max-width: 450px; margin: 0 auto 1.5rem auto;">
                        We couldn't find any medicines matching "${currentFilters.search}". Try checking the spelling or adjusting your filters.
                    </p>
                    <button class="btn btn-primary" onclick="resetFilters()">Reset All Filters</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = medicines.map(med => `
            <div class="medicine-card">
                ${med.prescription_required ? `<span class="badge badge-warning medicine-card-badge"><i class="fa-solid fa-file-prescription"></i> Rx Required</span>` : `<span class="badge badge-success medicine-card-badge"><i class="fa-solid fa-shield-halved"></i> OTC</span>`}
                <button class="wishlist-toggle-btn" onclick="toggleWishlist('${med._id || med.medicine_id}', this)" title="Add to Wishlist">
                    <i class="fa-regular fa-heart"></i>
                </button>
                <div class="medicine-thumb">
                    <img src="${med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'}" alt="${med.name}" onerror="this.src='https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'">
                </div>
                <div class="medicine-info">
                    <span class="medicine-category-tag">${med.category || 'General'} • ${med.form || 'Tablet'}</span>
                    <h4 class="medicine-title">
                        <a href="medicine-details.html?id=${med._id || med.medicine_id}">${med.name}</a>
                    </h4>
                    <p class="medicine-brand">By ${med.brand_name || med.manufacturer || 'Pharmacy'}</p>
                    <p class="medicine-composition" title="${med.composition}"><strong>Contents:</strong> ${med.composition || 'Active therapeutic salt'}</p>
                    ${med.uses ? `<p class="medicine-uses" style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${med.uses}"><strong>Uses:</strong> ${med.uses}</p>` : ''}
                    <div style="display: flex; gap: 0.5rem; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <span>Mfg: <strong>${med.mfg_date || '01/2026'}</strong></span> • 
                        <span>Exp: <strong>${med.expiry_date || '12/2028'}</strong></span>
                    </div>
                    
                    <div class="medicine-bottom-row">
                        <div class="medicine-price">
                            ₹${med.price}
                        </div>
                        <button class="btn btn-primary btn-sm" id="btn-add-${med._id || med.medicine_id}" onclick="addToCart('${med._id || med.medicine_id}', 1, this)">
                            <i class="fa-solid fa-cart-plus"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--danger);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p>Failed to load medicines. Please ensure backend is running.</p>
            </div>
        `;
    }
}

function resetFilters() {
    currentFilters = { search: '', category: '', form: '', sort: 'popular', prescription: '' };
    const searchInput = document.getElementById('medicine-search-input');
    if (searchInput) searchInput.value = '';
    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = '';
    const formSelect = document.getElementById('filter-form');
    if (formSelect) formSelect.value = '';
    fetchMedicines();
}

// Add to Cart
async function addToCart(medicineId, quantity = 1, btn = null) {
    if (!MedAuth.isAuthenticated()) {
        showToast('Please login to add items to your cart.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
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
            body: JSON.stringify({ medicine_id: medicineId, quantity })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Medicine added to cart!', 'success');
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
            if (typeof updateHeaderBadges === 'function') {
                updateHeaderBadges();
            }
        } else {
            showToast(data.message || 'Could not add to cart.', 'error');
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    } catch (err) {
        showToast('Network error adding to cart.', 'error');
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
}

// Wishlist Toggle
async function toggleWishlist(medicineId, btn) {
    if (!MedAuth.isAuthenticated()) {
        showToast('Please login to save to wishlist.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/wishlist`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ medicine_id: medicineId })
        });
        const data = await res.json();

        if (res.ok) {
            const icon = btn.querySelector('i');
            if (icon) {
                if (icon.classList.contains('fa-regular')) {
                    icon.classList.replace('fa-regular', 'fa-solid');
                    btn.classList.add('active');
                    showToast('Saved to wishlist!', 'success');
                } else {
                    icon.classList.replace('fa-solid', 'fa-regular');
                    btn.classList.remove('active');
                    showToast('Removed from wishlist.', 'info');
                }
            }
        }
    } catch (err) {
        showToast('Error updating wishlist.', 'error');
    }
}
