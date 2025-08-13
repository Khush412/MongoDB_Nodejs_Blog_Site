document.addEventListener('DOMContentLoaded', () => {
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatWidget = document.getElementById('chatWidget');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');

  let conversation = []; // Array of message objects like { role: 'user'|'bot', content: '...' }

  // Toggle chat visibility
  chatToggleBtn.addEventListener('click', () => {
    chatWidget.style.display = 'flex';
    chatToggleBtn.style.display = 'none';
    chatInput.focus();
  });
  chatCloseBtn.addEventListener('click', () => {
    chatWidget.style.display = 'none';
    chatToggleBtn.style.display = 'flex';
  });

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', role);
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    conversation.push({ role: 'user', content: text });
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    // Send the conversation array to backend
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation })
      });
      const data = await res.json();
      if (data.success) {
        appendMessage('bot', data.message);
        conversation.push({ role: 'bot', content: data.message });
      } else {
        appendMessage('bot', 'Sorry, I failed to get a response.');
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      appendMessage('bot', 'Error communicating with the bot.');
    }
    
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
  }

  chatSendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
});
