/**
 * ==========================================================================
 * MEDCONNECT – Medicine Reminders & Voice Alerts (reminders.js)
 * Real-time reminder monitor, Web Speech synthesis, Snooze/Taken/Dismiss
 * ==========================================================================
 */

let allReminders = [];
let activeAlarmReminder = null;
let snoozeTimers = {};

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();
    loadReminders();
    initVoiceToggle();

    // Start Real-Time Reminder Clock
    setInterval(checkRemindersClock, 10000); // Check every 10 seconds

    // Add Reminder Form
    const addForm = document.getElementById('add-reminder-form');
    if (addForm) {
        addForm.addEventListener('submit', handleAddReminder);
    }
});

function initVoiceToggle() {
    const voiceSwitch = document.getElementById('voice-toggle-switch');
    if (voiceSwitch) {
        voiceSwitch.checked = MedVoice.isEnabled();
        voiceSwitch.addEventListener('change', (e) => {
            MedVoice.setEnabled(e.target.checked);
            showToast(e.target.checked ? 'Voice reminders enabled!' : 'Voice reminders muted.', 'info');
            if (e.target.checked) {
                MedVoice.speak('Voice reminders are active.');
            }
        });
    }
}

async function loadReminders() {
    const container = document.getElementById('reminders-grid-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/reminders`, {
            headers: MedAuth.getHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            showToast('Failed to load reminders.', 'error');
            return;
        }

        allReminders = data.reminders || [];
        renderRemindersList(allReminders);

    } catch (err) {
        console.error('Error fetching reminders:', err);
    }
}

function renderRemindersList(reminders) {
    const container = document.getElementById('reminders-grid-container');
    if (!container) return;

    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state card" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-bell-slash empty-icon"></i>
                <h3>No Medicine Reminders</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Never miss a dose again. Set up daily or weekly voice alerts.</p>
                <button class="btn btn-primary" onclick="openModal('add-reminder-modal')">Set Reminder</button>
            </div>
        `;
        return;
    }

    container.innerHTML = reminders.map(r => `
        <div class="reminder-card ${r.status === 'Taken' ? 'taken' : 'pending'}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="reminder-time-large">
                    <i class="fa-regular fa-clock"></i>
                    <span>${r.time}</span>
                </div>
                <span class="badge ${r.status === 'Taken' ? 'badge-success' : 'badge-warning'}">
                    ${r.status === 'Taken' ? 'Taken' : 'Pending'}
                </span>
            </div>

            <div class="reminder-details">
                <h4>${r.medicine_name}</h4>
                <p><strong>Dosage:</strong> ${r.dosage || '1 Tablet'}</p>
                <p><strong>Frequency:</strong> ${r.frequency || 'Daily'}</p>
                ${r.notes ? `<p><em>${r.notes}</em></p>` : ''}
            </div>

            <div class="reminder-actions-row">
                ${r.status !== 'Taken' ? `
                    <button class="btn btn-primary btn-sm" onclick="markAsTaken('${r._id}')">
                        <i class="fa-solid fa-check"></i> Mark Taken
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="skipReminder('${r._id}')">
                        Skip
                    </button>
                ` : `
                    <span style="font-size: 0.85rem; color: var(--success); font-weight: 600;">
                        <i class="fa-solid fa-circle-check"></i> Completed for today
                    </span>
                `}
                <button class="btn btn-outline btn-sm" style="margin-left: auto; color: var(--danger);" onclick="deleteReminder('${r._id}')" title="Delete">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function handleAddReminder(e) {
    e.preventDefault();

    const medicine_name = document.getElementById('rem-medicine-name').value.trim();
    const dosage = document.getElementById('rem-dosage').value.trim();
    const time = document.getElementById('rem-time').value;
    const frequency = document.getElementById('rem-frequency').value;
    const notes = document.getElementById('rem-notes') ? document.getElementById('rem-notes').value.trim() : '';

    if (!medicine_name || !time) {
        showToast('Please specify medicine name and time.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/reminders`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ medicine_name, dosage, time, frequency, notes })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Reminder scheduled successfully!', 'success');
            closeModal('add-reminder-modal');
            document.getElementById('add-reminder-form').reset();
            loadReminders();
        } else {
            showToast(data.message || 'Failed to add reminder.', 'error');
        }
    } catch (err) {
        showToast('Network error adding reminder.', 'error');
    }
}

async function markAsTaken(reminderId) {
    try {
        const res = await fetch(`${API_BASE}/reminders/${reminderId}/taken`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Marked dose as taken! Great job keeping on schedule.', 'success');
            closeModal('voice-alert-modal');
            loadReminders();
        } else {
            showToast('Error marking taken.', 'error');
        }
    } catch (e) {
        showToast('Network error.', 'error');
    }
}

async function skipReminder(reminderId) {
    try {
        const res = await fetch(`${API_BASE}/reminders/${reminderId}/skip`, {
            method: 'POST',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Reminder skipped for today.', 'info');
            closeModal('voice-alert-modal');
            loadReminders();
        }
    } catch (e) {}
}

async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    try {
        const res = await fetch(`${API_BASE}/reminders/${id}`, {
            method: 'DELETE',
            headers: MedAuth.getHeaders()
        });
        if (res.ok) {
            showToast('Reminder removed.', 'info');
            loadReminders();
        }
    } catch (e) {}
}

// Clock Checker: Trigger Voice & Modal Alarm when time strikes
function checkRemindersClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    allReminders.forEach(reminder => {
        if (reminder.status !== 'Taken' && reminder.time === currentTimeStr) {
            // Trigger voice synthesis (only once per minute)
            if (!reminder._alarmTriggeredMinute || reminder._alarmTriggeredMinute !== currentTimeStr) {
                reminder._alarmTriggeredMinute = currentTimeStr;
                triggerReminderAlarm(reminder);
            }
        }
    });
}

function triggerReminderAlarm(reminder) {
    activeAlarmReminder = reminder;

    // Web Speech API Voice synthesis
    const speechMessage = `It's time to take your medicine, ${reminder.medicine_name}, ${reminder.dosage || ''}. Please take it as prescribed.`;
    MedVoice.speak(speechMessage);

    // Browser Notification
    sendBrowserNotification(`Medicine Time: ${reminder.medicine_name}`, {
        body: `Dosage: ${reminder.dosage || '1 dose'}. Please take it now.`,
        requireInteraction: true
    });

    // Populate and open Alarm Modal
    const modal = document.getElementById('voice-alert-modal');
    if (modal) {
        document.getElementById('alarm-medicine-name').innerText = reminder.medicine_name;
        document.getElementById('alarm-dosage-text').innerText = `${reminder.dosage || '1 Tablet'} (${reminder.frequency || 'Daily'})`;

        document.getElementById('alarm-taken-btn').onclick = () => markAsTaken(reminder._id);
        document.getElementById('alarm-snooze-btn').onclick = () => snoozeAlarm(reminder);
        document.getElementById('alarm-dismiss-btn').onclick = () => dismissAlarm(reminder);

        openModal('voice-alert-modal');
    }
}

function snoozeAlarm(reminder) {
    closeModal('voice-alert-modal');
    showToast(`Reminder snoozed for 5 minutes.`, 'info');
    setTimeout(() => {
        triggerReminderAlarm(reminder);
    }, 5 * 60 * 1000); // 5 minutes
}

function dismissAlarm(reminder) {
    closeModal('voice-alert-modal');
    showToast('Reminder dismissed.', 'info');
}
