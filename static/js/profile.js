/**
 * ==========================================================================
 * MEDCONNECT – Profile Controller (profile.js)
 * Account Details, Address Management, Password Change
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadUserProfile();

    // Tab switching
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
            const targetContent = document.getElementById(target);
            if (targetContent) targetContent.style.display = 'block';
        });
    });

    const profileForm = document.getElementById('edit-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleUpdateProfile);
    }

    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handleChangePassword);
    }
});

async function loadUserProfile() {
    try {
        const res = await fetch(`${API_BASE}/profile`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load profile details.', 'error');
            return;
        }

        const user = data.user;
        MedAuth.setUser(user); // refresh cached user

        // Populate fields
        if (document.getElementById('profile-name-display')) document.getElementById('profile-name-display').innerText = user.name || 'User';
        if (document.getElementById('profile-email-display')) document.getElementById('profile-email-display').innerText = user.email || '';
        if (document.getElementById('profile-avatar-initial')) document.getElementById('profile-avatar-initial').innerText = (user.name ? user.name.charAt(0) : 'U').toUpperCase();

        if (document.getElementById('prof-name')) document.getElementById('prof-name').value = user.name || '';
        if (document.getElementById('prof-email')) document.getElementById('prof-email').value = user.email || '';
        if (document.getElementById('prof-phone')) document.getElementById('prof-phone').value = user.phone || '';

        if (user.address) {
            if (document.getElementById('prof-street')) document.getElementById('prof-street').value = user.address.street || '';
            if (document.getElementById('prof-city')) document.getElementById('prof-city').value = user.address.city || '';
            if (document.getElementById('prof-state')) document.getElementById('prof-state').value = user.address.state || '';
            if (document.getElementById('prof-pincode')) document.getElementById('prof-pincode').value = user.address.pincode || '';
        }

        // Stats
        if (document.getElementById('prof-total-orders')) document.getElementById('prof-total-orders').innerText = data.stats?.orders_count || 0;
        if (document.getElementById('prof-total-prescriptions')) document.getElementById('prof-total-prescriptions').innerText = data.stats?.prescriptions_count || 0;

    } catch (err) {
        console.error('Error fetching profile:', err);
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();

    const name = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const street = document.getElementById('prof-street').value.trim();
    const city = document.getElementById('prof-city').value.trim();
    const state = document.getElementById('prof-state').value.trim();
    const pincode = document.getElementById('prof-pincode').value.trim();

    if (!name || !phone) {
        showToast('Please enter your name and phone.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({
                name,
                phone,
                address: { street, city, state, pincode }
            })
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Profile updated successfully!', 'success');
            MedAuth.setUser(data.user);
            loadUserProfile();
        } else {
            showToast(data.message || 'Error updating profile.', 'error');
        }
    } catch (e) {
        showToast('Network error updating profile.', 'error');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();

    const current_password = document.getElementById('pass-current').value;
    const new_password = document.getElementById('pass-new').value;
    const confirm_password = document.getElementById('pass-confirm').value;

    if (!current_password || !new_password) {
        showToast('Please fill in password fields.', 'error');
        return;
    }

    if (new_password.length < 6) {
        showToast('New password must be at least 6 characters.', 'error');
        return;
    }

    if (new_password !== confirm_password) {
        showToast('New passwords do not match.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/profile/password`, {
            method: 'PUT',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ current_password, new_password })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Password changed successfully!', 'success');
            document.getElementById('change-password-form').reset();
        } else {
            showToast(data.message || 'Could not change password.', 'error');
        }
    } catch (e) {
        showToast('Network error.', 'error');
    }
}
