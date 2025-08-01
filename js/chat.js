// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const liveChatBtn = document.getElementById('liveChatBtn');
    const chatModal = document.getElementById('chatModal');
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatMessage');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Buka modal chat
    if (liveChatBtn && chatModal) {
        liveChatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            chatModal.style.display = 'flex';
            
            // Load pesan
            loadChatMessages();
            
            // Tutup modal
            const closeBtn = chatModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                chatModal.style.display = 'none';
            });
        });
    }
    
    // Kirim pesan
    if (sendMessageBtn && chatInput) {
        sendMessageBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// Fungsi untuk memuat pesan chat
function loadChatMessages() {
    const userId = auth.currentUser.uid;
    const chatContainer = document.getElementById('chatContainer');
    
    if (chatContainer) {
        db.ref('chats').orderByChild('userId').equalTo(userId).on('value', (snapshot) => {
            chatContainer.innerHTML = '';
            
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push(childSnapshot.val());
            });
            
            // Urutkan berdasarkan tanggal
            messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // Tampilkan pesan
            messages.forEach((message) => {
                const messageElement = document.createElement('div');
                messageElement.className = `chat-message ${message.sender === 'user' ? 'user' : 'admin'}`;
                
                messageElement.innerHTML = `
                    <div class="message-bubble">
                        <p>${message.text}</p>
                        <div class="message-time">${formatTime(message.timestamp)}</div>
                    </div>
                `;
                
                chatContainer.appendChild(messageElement);
            });
            
            // Scroll ke bawah
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }
}

// Fungsi untuk mengirim pesan
function sendMessage() {
    const userId = auth.currentUser.uid;
    const chatInput = document.getElementById('chatMessage');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
    // Buat data pesan
    const messageId = db.ref().child('chats').push().key;
    const messageData = {
        id: messageId,
        userId: userId,
        sender: 'user',
        text: messageText,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // Simpan ke database
    db.ref(`chats/${messageId}`).set(messageData)
        .then(() => {
            chatInput.value = '';
            
            // Scroll ke bawah
            const chatContainer = document.getElementById('chatContainer');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        })
        .catch((error) => {
            alert(`Gagal mengirim pesan: ${error.message}`);
        });
}

// Fungsi untuk format waktu
function formatTime(timestamp) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    return new Date(timestamp).toLocaleTimeString('id-ID', options);
}
