/**
 * ==========================================================================
 * MEDCONNECT – Core Framework (main.js)
 * Modern UI interactions, Sidebar toggle, Notifications, Toast Alerts,
 * Universal Web Audio Bell Chime, and Global Timing Monitor
 * ==========================================================================
 */

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Global Toast Notification Helper
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; max-width: 420px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert-banner alert-${type}`;
    toast.style.cssText = 'box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideInRight 0.3s ease;';
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-bell fa-shake';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div style="flex: 1;">${message}</div>
        <button class="alert-close" onclick="this.parentElement.remove();">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Universal Web Audio API Dual-Tone Hospital Bell Chime Synthesizer
window.globalBellAudioCtx = null;
window.globalBellOscillators = [];

window.stopMedicationBellChime = function() {
    if (window.globalBellOscillators && window.globalBellOscillators.length) {
        window.globalBellOscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        window.globalBellOscillators = [];
    }
    if (window.globalBellAudioCtx) {
        try {
            window.globalBellAudioCtx.close();
        } catch(e) {}
        window.globalBellAudioCtx = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0);
    }
};

window.playMedicationBellChime = function() {
    window.stopMedicationBellChime();
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        window.globalBellAudioCtx = new AudioCtx();
        const ctx = window.globalBellAudioCtx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        function playDingDong(freq, startTime, duration, gainLevel) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Bell exponential envelope
            gainNode.gain.setValueAtTime(0.001, startTime);
            gainNode.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            // Harmonic overtone for metallic brass ring
            const overtone = ctx.createOscillator();
            const overtoneGain = ctx.createGain();
            overtone.type = 'sine';
            overtone.frequency.setValueAtTime(freq * 2.02, startTime);
            overtoneGain.gain.setValueAtTime(0.001, startTime);
            overtoneGain.gain.linearRampToValueAtTime(gainLevel * 0.35, startTime + 0.015);
            overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * 0.65));

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            overtone.connect(overtoneGain);
            overtoneGain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
            overtone.start(startTime);
            overtone.stop(startTime + duration);

            window.globalBellOscillators.push(osc, overtone);
        }

        const t = ctx.currentTime;
        // First Ding-Dong (880Hz -> 1174.66Hz)
        playDingDong(880, t, 1.4, 0.5);
        playDingDong(1174.66, t + 0.28, 1.8, 0.6);

        // Second Ding-Dong after 1.25s
        playDingDong(880, t + 1.25, 1.4, 0.5);
        playDingDong(1174.66, t + 1.53, 2.0, 0.6);

        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    } catch (e) {
        console.warn('Audio Bell Chime notification:', e);
    }
};

// Global background timing check for scheduled medicine reminders
const globalFiredTimestamps = new Set();

function normalizeTimeTo24Hr(timeStr) {
    if (!timeStr) return '';
    timeStr = timeStr.trim();
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        const parts = timeStr.split(':');
        return `${String(parts[0]).padStart(2, '0')}:${parts[1]}`;
    }
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
        let hrs = parseInt(match[1], 10);
        const mins = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        return `${String(hrs).padStart(2, '0')}:${mins}`;
    }
    return timeStr;
}

function checkGlobalReminders() {
    const reminders = window.MEDCONNECT_GLOBAL_REMINDERS || [];
    if (!reminders || !reminders.length) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime24 = `${hh}:${mm}`;

    reminders.forEach(rem => {
        if (rem.is_taken) return;
        const target24 = normalizeTimeTo24Hr(rem.scheduled_time);
        if (target24 === currentTime24) {
            const fireKey = `${rem.id || rem._id}_${currentTime24}`;
            if (!globalFiredTimestamps.has(fireKey)) {
                globalFiredTimestamps.add(fireKey);
                // Trigger audio chime
                window.playMedicationBellChime();
                // Show prominent toast notification across any page
                showToast(`
                    <strong>Medication Bell Ring:</strong> Time to take <strong>${rem.medicine_name}</strong> (${rem.dosage || '1 dose'})!
                    <div class="mt-1 small"><a href="/reminders/" style="color: #0f766e; text-decoration: underline; font-weight: 700;">Open Reminders Schedule &rarr;</a></div>
                `, 'warning', 8000);
            }
        }
    });
}

// Mobile Sidebar Drawer Toggle & Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    if (sidebarCloseBtn && sidebar) {
        sidebarCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Notification dropdown toggle
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (userProfileDropdown) userProfileDropdown.classList.remove('active');
            notifDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
                notifDropdown.classList.remove('active');
            }
        });
    }

    // User profile dropdown toggle
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userProfileDropdown = document.getElementById('userProfileDropdown');

    if (userProfileBtn && userProfileDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifDropdown) notifDropdown.classList.remove('active');
            userProfileDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userProfileDropdown.contains(e.target) && e.target !== userProfileBtn) {
                userProfileDropdown.classList.remove('active');
            }
        });
    }

    // Start global reminder checker every 5 seconds
    setInterval(checkGlobalReminders, 5000);
});
