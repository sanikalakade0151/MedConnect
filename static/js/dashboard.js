/**
 * ==========================================================================
 * MEDCONNECT – Dashboard Controller (dashboard.js)
 * Live metrics, Refill alerts, Today's reminders, Recent orders
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    MedAuth.requireAuth();

    // Load Dashboard Overview Data
    await loadDashboardData();

    // Check Auto-Refill 2-3 Day Notifications
    await checkAutoRefillAlerts();

    // Check Medicine Reminders due now
    await checkUpcomingVoiceReminders();
});

async function loadDashboardData() {
    try {
        const [ordersRes, remindersRes, subsRes] = await Promise.all([
            fetch(`${API_BASE}/orders`, { headers: MedAuth.getHeaders() }),
            fetch(`${API_BASE}/reminders`, { headers: MedAuth.getHeaders() }),
            fetch(`${API_BASE}/subscriptions`, { headers: MedAuth.getHeaders() })
        ]);

        if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            const orders = ordersData.orders || [];
            
            // Update active orders count
            const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
            const countEl = document.getElementById('dash-active-orders');
            if (countEl) countEl.innerText = activeOrders.length;

            renderRecentOrders(orders.slice(0, 3));
        }

        if (remindersRes.ok) {
            const remData = await remindersRes.json();
            const reminders = remData.reminders || [];
            const countEl = document.getElementById('dash-reminders-count');
            if (countEl) countEl.innerText = reminders.length;

            renderDashboardReminders(reminders.slice(0, 3));
        }

        if (subsRes.ok) {
            const subData = await subsRes.json();
            const subs = subData.subscriptions || [];
            const activeSubs = subs.filter(s => s.status === 'Active');
            const countEl = document.getElementById('dash-subscriptions-count');
            if (countEl) countEl.innerText = activeSubs.length;
        }

    } catch (err) {
        console.error('Error loading dashboard data:', err);
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById('dash-recent-orders-list');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                <p>No recent orders found. Start shopping!</p>
                <a href="medicines.html" class="btn btn-primary btn-sm" style="margin-top: 0.75rem;">Browse Medicines</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="reminder-item-compact" style="border-left: 4px solid var(--primary);">
            <div class="reminder-meta">
                <h5>Order #${order.order_id || order._id.substring(0, 8)}</h5>
                <p>${order.items ? order.items.length : 1} Item(s) • ₹${order.total_amount || 0} • ${order.order_date || 'Recent'}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
                <a href="tracking.html?order_id=${order._id || order.order_id}" class="btn btn-outline btn-sm">
                    <i class="fa-solid fa-location-dot"></i> Track
                </a>
            </div>
        </div>
    `).join('');
}

function renderDashboardReminders(reminders) {
    const container = document.getElementById('dash-today-reminders-list');
    if (!container) return;

    if (!reminders || reminders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fa-solid fa-bell-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                <p>No reminders scheduled for today.</p>
                <a href="reminders.html" class="btn btn-primary btn-sm" style="margin-top: 0.75rem;">Set a Reminder</a>
            </div>
        `;
        return;
    }

    container.innerHTML = reminders.map(r => `
        <div class="reminder-item-compact">
            <div class="reminder-meta">
                <h5>${r.medicine_name} (${r.dosage})</h5>
                <p>${r.frequency} • ${r.status || 'Pending'}</p>
            </div>
            <div class="reminder-time-tag">
                <i class="fa-regular fa-clock"></i>
                <span>${r.time}</span>
            </div>
        </div>
    `).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Delivered': return 'badge-success';
        case 'Out for Delivery':
        case 'Shipped': return 'badge-info';
        case 'Processing':
        case 'Packed': return 'badge-warning';
        case 'Cancelled': return 'badge-danger';
        default: return 'badge-primary';
    }
}

// Check if any subscriptions are due in 1, 2, or 3 days
async function checkAutoRefillAlerts() {
    try {
        const res = await fetch(`${API_BASE}/subscriptions/alerts`, {
            headers: MedAuth.getHeaders()
        });
        if (!res.ok) return;

        const data = await res.json();
        const alerts = data.alerts || [];

        if (alerts.length > 0) {
            const alertBanner = document.getElementById('dash-refill-alert-banner');
            const alertMsg = document.getElementById('dash-refill-alert-msg');
            const orderBtn = document.getElementById('dash-refill-now-btn');

            const item = alerts[0];
            if (alertBanner && alertMsg) {
                alertMsg.innerHTML = `<strong>Auto-Refill Due:</strong> Your subscription for <strong>${item.medicine_name}</strong> is due in <strong>${item.days_left} day(s)</strong> (${item.next_order_date}). Would you like to confirm this order now?`;
                alertBanner.style.display = 'flex';
                
                if (orderBtn) {
                    orderBtn.onclick = () => confirmRefillOrder(item.subscription_id);
                }
            }

            // Web Speech Voice announcement for upcoming refill
            if (item.days_left <= 3) {
                MedVoice.speak(`Attention. Your medicine refill for ${item.medicine_name} is due in ${item.days_left} days.`);
            }
        }
    } catch (err) {
        console.error('Error checking refill alerts:', err);
    }
}

async function confirmRefillOrder(subscriptionId) {
    try {
        const res = await fetch(`${API_BASE}/subscriptions/${subscriptionId}/order`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Refill order placed successfully!', 'success');
            setTimeout(() => {
                window.location.href = `orders.html`;
            }, 1200);
        } else {
            showToast(data.message || 'Failed to place refill order.', 'error');
        }
    } catch (err) {
        showToast('Network error while placing refill order.', 'error');
    }
}

// Background Voice Reminder Checker
async function checkUpcomingVoiceReminders() {
    try {
        const res = await fetch(`${API_BASE}/reminders`, { headers: MedAuth.getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const reminders = data.reminders || [];
        
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMins = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMins}`;

        reminders.forEach(r => {
            if (r.status !== 'Taken' && r.time === currentTimeStr) {
                MedVoice.speak(`It's time to take your medicine, ${r.medicine_name}. Please take it as prescribed.`);
                showToast(`Time to take ${r.medicine_name} (${r.dosage})!`, 'warning', 8000);
            }
        });
    } catch (e) {}
}
