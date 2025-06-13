const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(`${wsProtocol}${window.location.host}/ws/chat/`); // Replace `/ws/chat/` with your WebSocket URL

const messageInput = document.getElementById('messageInput');
const messageArea = document.getElementById('messageArea');
const sendButton = document.getElementById('sendButton');

// Send a message when the "Send" button is clicked
sendButton.addEventListener('click', sendMessage);

// Send message on pressing Enter key
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.send(JSON.stringify({ content: message })); // Send message to WebSocket server
        appendMessage('You', message, 'sent');
        messageInput.value = ''; // Clear input
    }
}

// Append messages to the chat area
function appendMessage(sender, content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = `${sender}: ${content}`;
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight; // Scroll to the latest message
}

// Handle incoming WebSocket messages
socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    appendMessage(data.sender, data.content, 'received'); // Display received message
};

socket.onclose = function () {
    appendMessage('System', 'Connection closed.', 'received');
};

socket.onerror = function (error) {
    console.error('WebSocket error:', error);
};
