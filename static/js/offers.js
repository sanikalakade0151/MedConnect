/**
 * ==========================================================================
 * MEDCONNECT – Offers & Coupons Controller (offers.js)
 * Active Promo Codes, Copy to Clipboard, Terms
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    loadOffers();
});

async function loadOffers() {
    const container = document.getElementById('offers-grid-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/offers`);
        const data = await res.json();
        const offers = data.offers || [];

        container.innerHTML = offers.map(offer => `
            <div class="card" style="border-left: 5px solid var(--primary); position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <span class="badge badge-primary">${offer.discount_tag || 'OFFER'}</span>
                    <small style="color: var(--text-muted); font-size: 0.8rem;">Expires: ${offer.expiry_date || 'Ongoing'}</small>
                </div>
                <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">${offer.title}</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.25rem;">${offer.description}</p>
                
                <div style="background: var(--bg-main); border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <code style="font-size: 1.1rem; font-weight: 800; color: var(--primary); letter-spacing: 0.05em;">${offer.code}</code>
                    <button class="btn btn-primary btn-sm" onclick="copyCouponCode('${offer.code}')">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.75rem;">
                    * Min order value: ₹${offer.min_order_amount || 0}. Valid once per user.
                </p>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error fetching offers:', err);
    }
}

function copyCouponCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Coupon code ${code} copied to clipboard!`, 'success');
    }).catch(() => {
        showToast(`Coupon code: ${code}`, 'info');
    });
}
