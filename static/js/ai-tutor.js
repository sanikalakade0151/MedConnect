/**
 * ==========================================================================
 * MEDCONNECT – AI Medical Tutor Controller (ai-tutor.js)
 * Interactive healthcare chat, suggested questions, typing indicators
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    MedAuth.requireAuth();

    const sendBtn = document.getElementById('send-ai-btn');
    const input = document.getElementById('ai-chat-input');
    const clearBtn = document.getElementById('clear-chat-btn');

    if (sendBtn && input) {
        sendBtn.addEventListener('click', handleSendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearChatHistory);
    }

    // Suggested questions click handler
    document.querySelectorAll('.suggested-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.getAttribute('data-question') || btn.innerText;
            if (input) {
                input.value = question;
                handleSendMessage();
            }
        });
    });
});

async function handleSendMessage() {
    const input = document.getElementById('ai-chat-input');
    const messagesContainer = document.getElementById('chat-messages-container');
    if (!input || !messagesContainer) return;

    const messageText = input.value.trim();
    if (!messageText) return;

    // Clear input
    input.value = '';

    // Append User Message Bubble
    appendMessageBubble('user', messageText);

    // Show Typing Indicator
    const typingIndicator = showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/ai-tutor`, {
            method: 'POST',
            headers: MedAuth.getHeaders(),
            body: JSON.stringify({ message: messageText })
        });

        const data = await response.json();
        typingIndicator.remove();

        if (response.ok) {
            appendMessageBubble('bot', data.response);
        } else {
            appendMessageBubble('bot', data.message || 'I encountered an issue processing your question. Please try again.');
        }

    } catch (err) {
        typingIndicator.remove();
        appendMessageBubble('bot', 'Network error. Please make sure the MedConnect backend server is running.');
    }
}

function appendMessageBubble(sender, text) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

    const formattedContent = formatBotResponse(text);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
        <div class="bubble-avatar">
            <i class="fa-solid ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="bubble-content">
            <div>${formattedContent}</div>
            <div class="bubble-time">${timeStr}</div>
        </div>
    `;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    const indicator = document.createElement('div');
    indicator.className = 'chat-bubble bot';
    indicator.innerHTML = `
        <div class="bubble-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
    return indicator;
}

function formatBotResponse(text) {
    // Simple safe markdown formatting (bold, bullet points, line breaks)
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
}

function clearChatHistory() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML = `
            <div class="chat-bubble bot">
                <div class="bubble-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="bubble-content">
                    <p>Hello! I am your <strong>MedConnect AI Healthcare Tutor</strong>. You can ask me any medical, pharmacological, or healthcare questions such as how medicines work, dosage definitions, missed dose safety, and OTC differences.</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;"><i class="fa-solid fa-circle-info"></i> For informational purposes only. Consult a doctor for medical emergencies.</p>
                </div>
            </div>
        `;
    }
}
