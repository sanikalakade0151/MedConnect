/**
 * ==========================================================================
 * MEDCONNECT – Checkout Controller (checkout.js)
 * Delivery Address, Payment Selection, Order Placement, Confirmation Popup
 * ==========================================================================
 */

let selectedPaymentMethod = 'UPI';

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    populateSavedAddress();
    loadCheckoutSummary();

    // Payment Method Selection
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedPaymentMethod = card.getAttribute('data-method');
            updatePaymentDetailsView(selectedPaymentMethod);
        });
    });

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handlePlaceOrder);
    }
});

function updatePaymentDetailsView(method) {
    const container = document.getElementById('payment-inputs-container');
    if (!container) return;

    if (method === 'UPI') {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Enter UPI ID</label>
                <input type="text" id="pay-upi-id" placeholder="e.g. mobile@upi, username@okhdfcbank" class="form-control" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);" value="user@medconnect">
                <small style="color: var(--text-muted); margin-top: 4px; display: block;"><i class="fa-solid fa-shield-halved"></i> Fast & Secure via Google Pay, PhonePe, Paytm</small>
            </div>
        `;
    } else if (method === 'Card') {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div class="form-group">
                    <label class="form-label">Card Number</label>
                    <input type="text" placeholder="4532 •••• •••• 8921" maxlength="19" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);" value="4532 8920 1192 8921">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label class="form-label">Expiry (MM/YY)</label>
                        <input type="text" placeholder="12/28" maxlength="5" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);" value="12/28">
                    </div>
                    <div>
                        <label class="form-label">CVV</label>
                        <input type="password" placeholder="•••" maxlength="3" style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);" value="821">
                    </div>
                </div>
            </div>
        `;
    } else if (method === 'Net Banking') {
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label">Select Bank</label>
                <select style="width: 100%; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);">
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Punjab National Bank</option>
                </select>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="padding: 1rem; background: var(--warning-light); border-radius: var(--radius-md); color: #92400e;">
                <i class="fa-solid fa-hand-holding-dollar"></i> Please keep exact cash handy at the time of delivery.
            </div>
        `;
    }
}

async function populateSavedAddress() {
    const user = MedAuth.getUser();
    if (!user) return;

    if (document.getElementById('checkout-name')) document.getElementById('checkout-name').value = user.name || '';
    if (document.getElementById('checkout-phone')) document.getElementById('checkout-phone').value = user.phone || '';
    if (document.getElementById('checkout-address') && user.address) document.getElementById('checkout-address').value = user.address.street || '';
    if (document.getElementById('checkout-city') && user.address) document.getElementById('checkout-city').value = user.address.city || 'Mumbai';
    if (document.getElementById('checkout-state') && user.address) document.getElementById('checkout-state').value = user.address.state || 'Maharashtra';
    if (document.getElementById('checkout-pincode') && user.address) document.getElementById('checkout-pincode').value = user.address.pincode || '400001';
}

function loadCheckoutSummary() {
    const sessionData = sessionStorage.getItem('medconnect_checkout_data');
    if (sessionData) {
        const data = JSON.parse(sessionData);
        if (document.getElementById('checkout-subtotal')) document.getElementById('checkout-subtotal').innerText = `₹${data.subtotal.toFixed(2)}`;
        if (document.getElementById('checkout-delivery')) document.getElementById('checkout-delivery').innerText = data.deliveryFee === 0 ? 'FREE' : `₹${data.deliveryFee.toFixed(2)}`;
        if (document.getElementById('checkout-discount')) document.getElementById('checkout-discount').innerText = `-₹${data.discount.toFixed(2)}`;
        if (document.getElementById('checkout-total')) document.getElementById('checkout-total').innerText = `₹${data.total.toFixed(2)}`;
    }
}

async function handlePlaceOrder(e) {
    e.preventDefault();

    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const street = document.getElementById('checkout-address').value.trim();
    const city = document.getElementById('checkout-city').value.trim();
    const state = document.getElementById('checkout-state').value.trim();
    const pincode = document.getElementById('checkout-pincode').value.trim();

    if (!name || !phone || !street || !city || !state || !pincode) {
        showToast('Please fill in all delivery address fields.', 'error');
        return;
    }

    const phoneClean = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
        showToast('Please enter a valid 10-digit mobile number.', 'error');
        return;
    }

    if (!/^\d{6}$/.test(pincode)) {
        showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
        return;
    }

    const submitBtn = document.getElementById('place-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';

    const orderPayload = {
        delivery_address: {
            name,
            phone: phoneClean,
            street,
            city,
            state,
            pincode
        },
        payment_method: selectedPaymentMethod
    };

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify(orderPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || 'Could not place order.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Place Order';
            return;
        }

        // Show Order Placed Successfully Popup Modal
        showOrderSuccessModal(data.order);
        updateHeaderBadges();

    } catch (err) {
        showToast('Network error during checkout.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Place Order';
    }
}

function showOrderSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    if (!modal) {
        window.location.href = `orders.html`;
        return;
    }

    document.getElementById('modal-order-id').innerText = order.order_id || order._id;
    document.getElementById('modal-order-date').innerText = order.order_date || new Date().toLocaleDateString();
    document.getElementById('modal-order-total').innerText = `₹${order.total_amount}`;
    document.getElementById('modal-order-eta').innerText = order.estimated_delivery || 'Within 2-3 hours';

    const trackBtn = document.getElementById('modal-track-btn');
    if (trackBtn) {
        trackBtn.href = `tracking.html?order_id=${order._id || order.order_id}`;
    }

    openModal('order-success-modal');

    // Voice announcement of order confirmation
    MedVoice.speak(`Congratulations! Your medicine order has been placed successfully.`);
}
