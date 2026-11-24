/**
 * ==========================================================================
 * MEDCONNECT – Subscriptions & Auto-Refills Controller (subscriptions.js)
 * Refill cycles (7/15/30/60 days), 2-3 day approaching notifications, Refill orders
 * ==========================================================================
 */

let allSubscriptions = [];

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadSubscriptions();
    checkSubscriptionDueNotifications();

    const addSubForm = document.getElementById('add-subscription-form');
    if (addSubForm) {
        addSubForm.addEventListener('submit', handleCreateSubscription);
    }
});

async function loadSubscriptions() {
    const container = document.getElementById('subscriptions-grid-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/subscriptions`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load subscriptions.', 'error');
            return;
        }

        allSubscriptions = data.subscriptions || [];
        renderSubscriptionsList(allSubscriptions);

    } catch (err) {
        console.error('Error fetching subscriptions:', err);
    }
}

function renderSubscriptionsList(subscriptions) {
    const container = document.getElementById('subscriptions-grid-container');
    if (!container) return;

    if (subscriptions.length === 0) {
        container.innerHTML = `
            <div class="empty-state card" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-arrows-spin empty-icon"></i>
                <h3>No Active Subscriptions</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Subscribe to chronic medications so you never run out of critical supplies.</p>
                <button class="btn btn-primary" onclick="openModal('add-sub-modal')">Create Subscription</button>
            </div>
        `;
        return;
    }

    container.innerHTML = subscriptions.map(sub => {
        const daysLeft = calculateDaysUntil(sub.next_order_date);
        const isApproaching = daysLeft <= 3 && daysLeft >= 0 && sub.status === 'Active';

        return `
            <div class="sub-card">
                <div class="sub-card-header">
                    <div>
                        <h4 class="sub-medicine-name">${sub.medicine_name}</h4>
                        <span class="badge ${sub.status === 'Active' ? 'badge-success' : 'badge-warning'}">${sub.status}</span>
                    </div>
                    ${isApproaching ? `
                        <div class="refill-countdown-pill">
                            <i class="fa-solid fa-bell"></i> Refill in ${daysLeft} day${daysLeft === 1 ? '' : 's'}
                        </div>
                    ` : ''}
                </div>

                <div class="sub-details-list">
                    <div class="sub-detail-row">
                        <span>Quantity per cycle:</span>
                        <strong>${sub.quantity} pack(s)</strong>
                    </div>
                    <div class="sub-detail-row">
                        <span>Frequency:</span>
                        <strong>Every ${sub.frequency_days} Days</strong>
                    </div>
                    <div class="sub-detail-row">
                        <span>Next Refill Date:</span>
                        <strong>${sub.next_order_date}</strong>
                    </div>
                    <div class="sub-detail-row">
                        <span>Payment Method:</span>
                        <strong>${sub.payment_method || 'Cash on Delivery'}</strong>
                    </div>
                </div>

                <div class="sub-actions">
                    ${isApproaching ? `
                        <button class="btn btn-primary btn-sm" onclick="triggerRefillNow('${sub._id}')">
                            <i class="fa-solid fa-cart-shopping"></i> Refill Now
                        </button>
                    ` : ''}
                    ${sub.status === 'Active' ? `
                        <button class="btn btn-outline btn-sm" onclick="togglePauseSub('${sub._id}', 'pause')">Pause</button>
                    ` : `
                        <button class="btn btn-outline btn-sm" onclick="togglePauseSub('${sub._id}', 'resume')">Resume</button>
                    `}
                    <button class="btn btn-outline btn-sm" style="color: var(--danger); margin-left: auto;" onclick="cancelSubscription('${sub._id}')">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateDaysUntil(dateString) {
    if (!dateString) return 999;
    const target = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 2-3 Day Approaching Refill Notification Logic
async function checkSubscriptionDueNotifications() {
    try {
        const res = await fetch(`${API_BASE}/subscriptions/alerts`, {
            headers: MedAuth.getHeaders()
        });
        if (!res.ok) return;

        const data = await res.json();
        const alerts = data.alerts || [];

        alerts.forEach(item => {
            let msg = '';
            if (item.days_left === 1) {
                msg = `Your medicine refill for ${item.medicine_name} is due tomorrow.`;
            } else if (item.days_left === 2) {
                msg = `Your medicine refill for ${item.medicine_name} is due in 2 days.`;
            } else if (item.days_left === 3) {
                msg = `Your medicine refill for ${item.medicine_name} is due in 3 days.`;
            }

            if (msg) {
                // Check if already notified today in session
                const storageKey = `refill_notif_${item.subscription_id}_${item.days_left}`;
                if (!sessionStorage.getItem(storageKey)) {
                    sessionStorage.setItem(storageKey, 'true');
                    showToast(msg, 'warning', 8000);
                    MedVoice.speak(msg);
                    sendBrowserNotification('MedConnect Refill Reminder', { body: msg });
                }
            }
        });
    } catch (err) {
        console.error('Error verifying refill alerts:', err);
    }
}

async function triggerRefillNow(subId) {
    try {
        const res = await fetch(`${API_BASE}/subscriptions/${subId}/order`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Refill order created successfully!', 'success');
            setTimeout(() => {
                window.location.href = `tracking.html?order_id=${data.order._id || data.order.order_id}`;
            }, 1000);
        } else {
            showToast(data.message || 'Could not place refill order.', 'error');
        }
    } catch (e) {
        showToast('Network error placing refill.', 'error');
    }
}

async function handleCreateSubscription(e) {
    e.preventDefault();

    const medicine_name = document.getElementById('sub-medicine-name').value.trim();
    const quantity = parseInt(document.getElementById('sub-quantity').value) || 1;
    const frequency_days = parseInt(document.getElementById('sub-frequency').value) || 30;
    const payment_method = document.getElementById('sub-payment-method').value;

    if (!medicine_name) {
        showToast('Please specify medicine name.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/subscriptions`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({
                medicine_name,
                quantity,
                frequency_days,
                payment_method
            })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Subscription activated successfully!', 'success');
            closeModal('add-sub-modal');
            document.getElementById('add-subscription-form').reset();
            loadSubscriptions();
        } else {
            showToast(data.message || 'Error creating subscription.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

async function togglePauseSub(subId, action) {
    try {
        const res = await fetch(`${API_BASE}/subscriptions/${subId}/${action}`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast(`Subscription ${action === 'pause' ? 'paused' : 'resumed'}.`, 'info');
            loadSubscriptions();
        }
    } catch (e) {}
}

async function cancelSubscription(subId) {
    if (!confirm('Are you sure you want to cancel this recurring subscription?')) return;
    try {
        const res = await fetch(`${API_BASE}/subscriptions/${subId}`, {
            method: 'DELETE',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Subscription cancelled.', 'info');
            loadSubscriptions();
        }
    } catch (e) {}
}
