/**
 * ==========================================================================
 * MEDCONNECT – Wishlist Controller (wishlist.js)
 * Saved items, Move to Cart, Remove
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadWishlist();
});

async function loadWishlist() {
    const container = document.getElementById('wishlist-grid-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/wishlist`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load wishlist.', 'error');
            return;
        }

        const items = data.wishlist || [];

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state card" style="grid-column: 1 / -1;">
                    <i class="fa-regular fa-heart empty-icon"></i>
                    <h3>Your Wishlist is Empty</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Save medicines and essential healthcare supplies to buy later.</p>
                    <a href="medicines.html" class="btn btn-primary">Discover Products</a>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="medicine-card">
                <div class="medicine-thumb">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'}" alt="${item.name}">
                </div>
                <div class="medicine-info">
                    <span class="medicine-category-tag">${item.category || 'Pharmacy'}</span>
                    <h4 class="medicine-title">
                        <a href="medicine-details.html?id=${item.medicine_id}">${item.name}</a>
                    </h4>
                    <p class="medicine-brand">By ${item.brand_name || 'Manufacturer'}</p>
                    
                    <div class="medicine-bottom-row">
                        <div class="medicine-price">₹${item.price}</div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-outline btn-sm" onclick="removeFromWishlist('${item.medicine_id}')" title="Remove">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="moveToCart('${item.medicine_id}')">
                                <i class="fa-solid fa-cart-plus"></i> Move to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error fetching wishlist:', err);
    }
}

async function removeFromWishlist(medicineId) {
    try {
        const res = await fetch(`${API_BASE}/wishlist/${medicineId}`, {
            method: 'DELETE',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Item removed from wishlist.', 'info');
            loadWishlist();
        }
    } catch (e) {}
}

async function moveToCart(medicineId) {
    try {
        const res = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ medicine_id: medicineId, quantity: 1 })
        });
        if (res.ok) {
            await removeFromWishlist(medicineId);
            showToast('Moved to cart!', 'success');
            updateHeaderBadges();
        }
    } catch (e) {}
}
