/**
 * ==========================================================================
 * MEDCONNECT – Authentication Controller (auth.js)
 * Form validation, Registration, Login, Token persistence
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // If user is already logged in, redirect to dashboard
    MedAuth.redirectIfAuthenticated();

    // Password Visibility Toggle
    document.querySelectorAll('.password-toggle').forEach(toggleBtn => {
        toggleBtn.addEventListener('click', () => {
            const input = toggleBtn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Handle Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                showToast('Please enter email and password.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || 'Login failed. Please check credentials.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Sign In';
                    return;
                }

                // Success
                MedAuth.setToken(data.token);
                MedAuth.setUser(data.user);
                showToast('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (err) {
                showToast('Unable to connect to server. Please check backend status.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In';
            }
        });
    }

    // Handle Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const termsAgreed = document.getElementById('reg-terms') ? document.getElementById('reg-terms').checked : true;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            // Validation rules
            if (!name) {
                showToast('Please enter your name.', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                showToast('Please enter a valid email address.', 'error');
                return;
            }

            // Indian mobile number check (10 digits starting with 6,7,8,9)
            const phoneClean = phone.replace(/\D/g, '');
            if (!/^[6-9]\d{9}$/.test(phoneClean)) {
                showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
                return;
            }

            if (!password || password.length < 6) {
                showToast('Password must contain at least 6 characters.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            if (!termsAgreed) {
                showToast('Please accept the Terms & Conditions.', 'warning');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        phone: phoneClean,
                        password,
                        confirm_password: confirmPassword
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || 'Registration failed.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Create Account';
                    return;
                }

                showToast('Registration successful. Please login.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);

            } catch (err) {
                showToast('Unable to connect to server. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Account';
            }
        });
    }
});
