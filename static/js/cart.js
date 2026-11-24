/**
 * ==========================================================================
 * MEDCONNECT – Cart Controller (cart.js)
 * Cart items management, quantities, coupon code, calculations
 * ==========================================================================
 */

let cartDataState = null;
let appliedDiscount = 0;
let appliedCouponCode = '';

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadCart();

    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', applyCoupon);
    }
});

async function loadCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/cart`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load cart items.', 'error');
            return;
        }

        cartDataState = data.cart || { items: [] };
        renderCartUI();

    } catch (err) {
        console.error('Cart load error:', err);
    }
}

function renderCartUI() {
    const container = document.getElementById('cart-items-container');
    const summaryCard = document.getElementById('cart-summary-section');
    if (!container) return;

    const items = cartDataState.items || [];

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-cart-shopping empty-icon"></i>
                <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">Your Cart is Empty</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Explore medicines, healthcare products, and get them delivered fast.</p>
                <a href="medicines.html" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        if (summaryCard) summaryCard.style.display = 'none';
        return;
    }

    if (summaryCard) summaryCard.style.display = 'block';

    container.innerHTML = items.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-thumb">
                <img src="${item.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150'}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div style="display: flex; gap: 0.35rem;">
                        <span class="badge badge-primary" style="font-size: 0.72rem;"><i class="fa-regular fa-calendar-check"></i> Mfg: ${item.mfg_date || '01/2026'}</span>
                        <span class="badge badge-warning" style="font-size: 0.72rem;"><i class="fa-regular fa-calendar-xmark"></i> Exp: ${item.expiry_date || '12/2028'}</span>
                    </div>
                </div>

                <p class="cart-item-meta" style="margin-bottom: 0.3rem;">
                    <strong>${item.form || 'Tablet'}</strong> • By ${item.manufacturer || 'Certified Pharmacy'}
                </p>

                <!-- Detailed Medicine Specifications in Cart -->
                <div style="background: var(--bg-main); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; margin-bottom: 0.6rem; border: 1px solid var(--border-color); font-size: 0.82rem;">
                    <div style="color: var(--text-primary); margin-bottom: 0.2rem;">
                        <i class="fa-solid fa-flask" style="color: var(--primary);"></i> <strong>Contents:</strong> ${item.composition || 'Active Pharmaceutical Formula'}
                    </div>
                    <div style="color: var(--text-secondary);">
                        <i class="fa-solid fa-stethoscope" style="color: var(--secondary);"></i> <strong>Uses:</strong> ${item.uses || 'Therapeutic healthcare use'}
                    </div>
                </div>

                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateItemQuantity('${item.medicine_id}', ${item.quantity - 1})">-</button>
                        <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                        <button class="quantity-btn" onclick="updateItemQuantity('${item.medicine_id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="removeItem('${item.medicine_id}')" title="Remove">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <div class="cart-item-price">
                ₹${(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');

    calculateTotals();
}

async function updateItemQuantity(medicineId, newQuantity) {
    if (newQuantity <= 0) {
        await removeItem(medicineId);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cart/update`, {
            method: 'PUT',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ medicine_id: medicineId, quantity: newQuantity })
        });
        const data = await res.json();

        if (res.ok) {
            cartDataState = data.cart;
            renderCartUI();
            updateHeaderBadges();
        } else {
            showToast(data.message || 'Error updating quantity.', 'error');
        }
    } catch (err) {
        showToast('Network error updating item.', 'error');
    }
}

async function removeItem(medicineId) {
    try {
        const res = await fetch(`${API_BASE}/cart/remove/${medicineId}`, {
            method: 'DELETE',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            cartDataState = data.cart;
            showToast('Item removed from cart.', 'info');
            renderCartUI();
            updateHeaderBadges();
        } else {
            showToast(data.message || 'Error removing item.', 'error');
        }
    } catch (err) {
        showToast('Network error removing item.', 'error');
    }
}

async function applyCoupon() {
    const couponInput = document.getElementById('coupon-code-input');
    if (!couponInput) return;

    const code = couponInput.value.trim().toUpperCase();
    if (!code) {
        showToast('Please enter a coupon code.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/offers/validate`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (res.ok && data.valid) {
            appliedDiscount = data.discount_amount || (data.discount_percent ? (calculateSubtotal() * data.discount_percent / 100) : 50);
            appliedCouponCode = code;
            showToast(`Coupon applied! You saved ₹${appliedDiscount.toFixed(2)}`, 'success');
            calculateTotals();
        } else {
            showToast(data.message || 'Invalid or expired coupon.', 'error');
        }
    } catch (err) {
        showToast('Error validating coupon.', 'error');
    }
}

function calculateSubtotal() {
    if (!cartDataState || !cartDataState.items) return 0;
    return cartDataState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function calculateTotals() {
    const subtotal = calculateSubtotal();
    const deliveryFee = subtotal > 500 || subtotal === 0 ? 0 : 40;
    const total = Math.max(0, subtotal + deliveryFee - appliedDiscount);

    const subEl = document.getElementById('summary-subtotal');
    const delEl = document.getElementById('summary-delivery');
    const discEl = document.getElementById('summary-discount');
    const totEl = document.getElementById('summary-total');

    if (subEl) subEl.innerText = `₹${subtotal.toFixed(2)}`;
    if (delEl) delEl.innerText = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`;
    if (discEl) discEl.innerText = `-₹${appliedDiscount.toFixed(2)}`;
    if (totEl) totEl.innerText = `₹${total.toFixed(2)}`;

    // Store checkout session total
    sessionStorage.setItem('medconnect_checkout_data', JSON.stringify({
        subtotal,
        deliveryFee,
        discount: appliedDiscount,
        coupon: appliedCouponCode,
        total
    }));
}

function proceedToCheckout() {
    if (!cartDataState || !cartDataState.items || cartDataState.items.length === 0) {
        showToast('Your cart is empty.', 'warning');
        return;
    }
    window.location.href = 'checkout.html';
}
