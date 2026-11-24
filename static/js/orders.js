/**
 * ==========================================================================
 * MEDCONNECT – Orders Controller (orders.js)
 * Order History, Status Badges, Reorder, Details Navigation
 * ==========================================================================
 */

let allOrdersList = [];

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadOrders();

    const statusFilter = document.getElementById('order-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterOrders(e.target.value);
        });
    }
});

async function loadOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load orders.', 'error');
            return;
        }

        allOrdersList = data.orders || [];
        renderOrdersList(allOrdersList);

    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

function filterOrders(status) {
    if (!status || status === 'All') {
        renderOrdersList(allOrdersList);
    } else {
        const filtered = allOrdersList.filter(o => o.status === status);
        renderOrdersList(filtered);
    }
}

function renderOrdersList(orders) {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state card">
                <i class="fa-solid fa-box-open empty-icon"></i>
                <h3>No Orders Found</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">You haven't placed any medicine orders yet.</p>
                <a href="medicines.html" class="btn btn-primary">Order Medicines Now</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-card-header">
                <div class="order-meta-group">
                    <div class="order-meta-item">
                        <span>Order ID</span>
                        <strong>#${order.order_id || (order._id ? order._id.substring(0, 8) : 'ORD')}</strong>
                    </div>
                    <div class="order-meta-item">
                        <span>Order Placed</span>
                        <strong>${order.order_date || 'Today'}</strong>
                    </div>
                    <div class="order-meta-item">
                        <span>Total Amount</span>
                        <strong>₹${order.total_amount}</strong>
                    </div>
                    <div class="order-meta-item">
                        <span>Payment</span>
                        <strong>${order.payment_method} (${order.payment_status || 'Paid'})</strong>
                    </div>
                </div>
                <div>
                    <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
                </div>
            </div>

            <div class="order-card-body">
                <div class="order-items-list">
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <div class="order-item-left">
                                <div class="order-item-img">
                                    <i class="fa-solid fa-pills" style="color: var(--primary);"></i>
                                </div>
                                <div>
                                    <h5 style="font-size: 0.95rem; font-weight: 700;">${item.name}</h5>
                                    <span style="font-size: 0.82rem; color: var(--text-secondary);">Qty: ${item.quantity} • ₹${item.price} each</span>
                                </div>
                            </div>
                            <div style="font-weight: 700;">
                                ₹${(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="order-card-footer">
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        <i class="fa-solid fa-truck-fast" style="color: var(--primary);"></i>
                        ${order.status === 'Delivered' ? 'Delivered successfully' : `Estimated delivery: <strong>${order.estimated_delivery || 'Within 2-3 hours'}</strong>`}
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="btn btn-outline btn-sm" onclick="reorderItems('${order._id || order.order_id}')">
                            <i class="fa-solid fa-rotate-right"></i> Reorder
                        </button>
                        <a href="order-details.html?id=${order._id || order.order_id}" class="btn btn-outline btn-sm">
                            <i class="fa-solid fa-receipt"></i> Details
                        </a>
                        <a href="tracking.html?order_id=${order._id || order.order_id}" class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-location-dot"></i> Track Live
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function reorderItems(orderId) {
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/reorder`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Items added to cart from previous order!', 'success');
            setTimeout(() => window.location.href = 'cart.html', 1000);
        } else {
            showToast(data.message || 'Could not reorder items.', 'error');
        }
    } catch (e) {
        showToast('Network error during reorder.', 'error');
    }
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
