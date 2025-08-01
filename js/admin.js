// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

// Kredensial admin
const ADMIN_CREDENTIALS = {
    username: 'invest-admin',
    password: 'invest-money'
};

document.addEventListener('DOMContentLoaded', function() {
    // Login admin
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                // Simpan status login admin di sessionStorage
                sessionStorage.setItem('adminLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('Username atau password admin salah!');
            }
        });
    }
    
    // Cek status login admin
    if (window.location.pathname.includes('admin')) {
        const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
        
        if (!isAdminLoggedIn && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
    
    // Logout admin
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('adminLoggedIn');
            window.location.href = 'login.html';
        });
    }
    
    // Load data admin dashboard
    if (document.getElementById('totalUsers')) {
        loadAdminDashboard();
    }
    
    // Kelola user
    setupUserManagement();
    
    // Kelola saldo
    setupBalanceManagement();
    
    // Live chat admin
    setupAdminChat();
});

// Fungsi untuk memuat dashboard admin
function loadAdminDashboard() {
    // Hitung total user
    db.ref('users').once('value')
        .then((snapshot) => {
            const userCount = snapshot.numChildren();
            document.getElementById('totalUsers').textContent = userCount;
        });
    
    // Hitung investasi aktif
    db.ref('investments').orderByChild('status').equalTo('active').once('value')
        .then((snapshot) => {
            const activeInvestments = snapshot.numChildren();
            document.getElementById('activeInvestments').textContent = activeInvestments;
        });
    
    // Hitung pendapatan hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    db.ref('investments').orderByChild('startDate').startAt(today.toISOString()).once('value')
        .then((snapshot) => {
            let todayIncome = 0;
            
            snapshot.forEach((childSnapshot) => {
                todayIncome += childSnapshot.val().amount;
            });
            
            document.getElementById('todayIncome').textContent = formatRupiah(todayIncome);
        });
    
    // Hitung total withdraw
    db.ref('withdraws').once('value')
        .then((snapshot) => {
            let totalWithdraw = 0;
            
            snapshot.forEach((childSnapshot) => {
                totalWithdraw += childSnapshot.val().amount;
            });
            
            document.getElementById('totalWithdraw').textContent = formatRupiah(totalWithdraw);
        });
    
    // Grafik pendapatan
    renderIncomeChart();
    
    // Grafik paket investasi
    renderPackageChart();
    
    // Aktivitas terbaru
    loadRecentActivity();
}

// Fungsi untuk setup manajemen user
function setupUserManagement() {
    const manageUsersBtn = document.getElementById('manageUsersBtn');
    const usersModal = document.getElementById('usersModal');
    
    if (manageUsersBtn && usersModal) {
        manageUsersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            usersModal.style.display = 'flex';
            
            // Load daftar user
            loadUserList();
            
            // Tutup modal
            const closeBtn = usersModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                usersModal.style.display = 'none';
            });
            
            // Tab
            setupTabs(usersModal);
            
            // Cari user
            const searchUserBtn = document.getElementById('searchUserBtn');
            if (searchUserBtn) {
                searchUserBtn.addEventListener('click', searchUser);
            }
            
            // Tambah user
            const addUserForm = document.getElementById('addUserForm');
            if (addUserForm) {
                addUserForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    addNewUser();
                });
            }
        });
    }
}

// Fungsi untuk memuat daftar user
function loadUserList() {
    const usersTableBody = document.getElementById('usersTableBody');
    
    if (usersTableBody) {
        db.ref('users').once('value')
            .then((snapshot) => {
                usersTableBody.innerHTML = '';
                
                snapshot.forEach((childSnapshot) => {
                    const user = childSnapshot.val();
                    const userId = childSnapshot.key;
                    
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${formatRupiah(user.balance || 0)}</td>
                        <td><span class="status-badge">Aktif</span></td>
                        <td>
                            <button class="btn-sm btn-danger delete-user" data-id="${userId}">Hapus</button>
                        </td>
                    `;
                    
                    usersTableBody.appendChild(row);
                });
                
                // Tambahkan event listener untuk tombol hapus
                document.querySelectorAll('.delete-user').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.getAttribute('data-id');
                        deleteUser(userId);
                    });
                });
            });
    }
}

// Fungsi untuk mencari user
function searchUser() {
    const searchInput = document.getElementById('searchUserInput').value.toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (searchInput.trim() === '') {
        alert('Masukkan username atau email untuk dicari');
        return;
    }
    
    db.ref('users').once('value')
        .then((snapshot) => {
            searchResults.innerHTML = '';
            let found = false;
            
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                
                if (user.username.toLowerCase().includes(searchInput) || 
                    user.email.toLowerCase().includes(searchInput)) {
                    
                    found = true;
                    
                    const userCard = document.createElement('div');
                    userCard.className = 'user-card';
                    
                    userCard.innerHTML = `
                        <div class="user-info">
                            <h4>${user.username}</h4>
                            <p>${user.email}</p>
                            <p>Saldo: ${formatRupiah(user.balance || 0)}</p>
                        </div>
                        <div class="user-actions">
                            <button class="btn-sm btn-primary edit-user" data-id="${userId}">Edit</button>
                            <button class="btn-sm btn-danger delete-user" data-id="${userId}">Hapus</button>
                        </div>
                    `;
                    
                    searchResults.appendChild(userCard);
                }
            });
            
            if (!found) {
                searchResults.innerHTML = '<p class="text-muted">User tidak ditemukan</p>';
            }
            
            // Tambahkan event listener untuk tombol edit dan hapus
            document.querySelectorAll('.edit-user').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    editUser(userId);
                });
            });
            
            document.querySelectorAll('.delete-user').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    deleteUser(userId);
                });
            });
        });
}

// Fungsi untuk menambah user baru
function addNewUser() {
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    
    if (!username || !email || !password) {
        alert('Isi semua field!');
        return;
    }
    
    // Buat akun dengan email dan password
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Simpan data user ke database
            const userData = {
                username: username,
                email: email,
                balance: 0,
                referralCode: generateReferralCode(),
                joinDate: new Date().toISOString()
            };
            
            db.ref('users/' + user.uid).set(userData)
                .then(() => {
                    alert('User berhasil ditambahkan');
                    document.getElementById('addUserForm').reset();
                    loadUserList();
                })
                .catch((error) => {
                    alert(`Gagal menyimpan data user: ${error.message}`);
                });
        })
        .catch((error) => {
            alert(`Gagal membuat user: ${error.message}`);
        });
}

// Fungsi untuk mengedit user
function editUser(userId) {
    // Implementasi edit user
    alert(`Edit user dengan ID: ${userId}`);
}

// Fungsi untuk menghapus user
function deleteUser(userId) {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
        // Hapus dari authentication
        db.ref('users/' + userId).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                
                if (userData && userData.email) {
                    auth.getUserByEmail(userData.email)
                        .then((userRecord) => {
                            return auth.deleteUser(userRecord.uid);
                        })
                        .then(() => {
                            // Hapus dari database
                            return db.ref('users/' + userId).remove();
                        })
                        .then(() => {
                            alert('User berhasil dihapus');
                            loadUserList();
                        })
                        .catch((error) => {
                            alert(`Gagal menghapus user: ${error.message}`);
                        });
                }
            });
    }
}

// Fungsi untuk setup manajemen saldo
function setupBalanceManagement() {
    const manageBalanceBtn = document.getElementById('manageBalanceBtn');
    const balanceModal = document.getElementById('balanceModal');
    
    if (manageBalanceBtn && balanceModal) {
        manageBalanceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            balanceModal.style.display = 'flex';
            
            // Tutup modal
            const closeBtn = balanceModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                balanceModal.style.display = 'none';
            });
            
            // Tab
            setupTabs(balanceModal);
            
            // Form tambah saldo
            const addBalanceForm = document.getElementById('addBalanceForm');
            if (addBalanceForm) {
                addBalanceForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const username = document.getElementById('addBalanceUsername').value;
                    const amount = parseInt(document.getElementById('addBalanceAmount').value) || 0;
                    addUserBalance(username, amount);
                });
            }
            
            // Form kurangi saldo
            const reduceBalanceForm = document.getElementById('reduceBalanceForm');
            if (reduceBalanceForm) {
                reduceBalanceForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const username = document.getElementById('reduceBalanceUsername').value;
                    const amount = parseInt(document.getElementById('reduceBalanceAmount').value) || 0;
                    reduceUserBalance(username, amount);
                });
            }
            
            // Form set saldo
            const setBalanceForm = document.getElementById('setBalanceForm');
            if (setBalanceForm) {
                setBalanceForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const username = document.getElementById('setBalanceUsername').value;
                    const amount = parseInt(document.getElementById('setBalanceAmount').value) || 0;
                    setUserBalance(username, amount);
                });
            }
        });
    }
}

// Fungsi untuk menambah saldo user
function addUserBalance(username, amount) {
    if (!username || amount <= 0) {
        alert('Isi username dan jumlah yang valid!');
        return;
    }
    
    // Cari user berdasarkan username
    db.ref('users').orderByChild('username').equalTo(username).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userId = Object.keys(userData)[0];
                
                // Update saldo
                db.ref('users/' + userId).transaction((user) => {
                    if (user) {
                        user.balance = (user.balance || 0) + amount;
                    }
                    return user;
                }).then(() => {
                    alert(`Berhasil menambahkan ${formatRupiah(amount)} ke akun ${username}`);
                    document.getElementById('addBalanceForm').reset();
                });
            } else {
                alert('User tidak ditemukan');
            }
        });
}

// Fungsi untuk mengurangi saldo user
function reduceUserBalance(username, amount) {
    if (!username || amount <= 0) {
        alert('Isi username dan jumlah yang valid!');
        return;
    }
    
    // Cari user berdasarkan username
    db.ref('users').orderByChild('username').equalTo(username).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userId = Object.keys(userData)[0];
                
                // Update saldo
                db.ref('users/' + userId).transaction((user) => {
                    if (user) {
                        if ((user.balance || 0) >= amount) {
                            user.balance = (user.balance || 0) - amount;
                        } else {
                            throw new Error('Saldo user tidak mencukupi');
                        }
                    }
                    return user;
                }).then(() => {
                    alert(`Berhasil mengurangi ${formatRupiah(amount)} dari akun ${username}`);
                    document.getElementById('reduceBalanceForm').reset();
                }).catch((error) => {
                    alert(`Gagal mengurangi saldo: ${error.message}`);
                });
            } else {
                alert('User tidak ditemukan');
            }
        });
}

// Fungsi untuk set saldo user
function setUserBalance(username, amount) {
    if (!username || amount < 0) {
        alert('Isi username dan jumlah yang valid!');
        return;
    }
    
    // Cari user berdasarkan username
    db.ref('users').orderByChild('username').equalTo(username).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userId = Object.keys(userData)[0];
                
                // Update saldo
                db.ref('users/' + userId).update({
                    balance: amount
                }).then(() => {
                    alert(`Berhasil mengatur saldo akun ${username} menjadi ${formatRupiah(amount)}`);
                    document.getElementById('setBalanceForm').reset();
                });
            } else {
                alert('User tidak ditemukan');
            }
        });
}

// Fungsi untuk setup live chat admin
function setupAdminChat() {
    const adminChatBtn = document.getElementById('adminChatBtn');
    const adminChatModal = document.getElementById('adminChatModal');
    
    if (adminChatBtn && adminChatModal) {
        adminChatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            adminChatModal.style.display = 'flex';
            
            // Load daftar chat
            loadChatList();
            
            // Tutup modal
            const closeBtn = adminChatModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                adminChatModal.style.display = 'none';
            });
            
            // Kirim pesan
            const sendMessageBtn = document.getElementById('adminSendMessageBtn');
            const chatInput = document.getElementById('adminChatInput');
            
            if (sendMessageBtn && chatInput) {
                sendMessageBtn.addEventListener('click', sendAdminMessage);
                chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendAdminMessage();
                    }
                });
            }
        });
    }
}

// Fungsi untuk memuat daftar chat
function loadChatList() {
    const chatList = document.getElementById('adminChatList');
    
    if (chatList) {
        // Dapatkan semua user yang pernah mengirim pesan
        db.ref('chats').once('value')
            .then((snapshot) => {
                const users = new Set();
                
                snapshot.forEach((childSnapshot) => {
                    const chat = childSnapshot.val();
                    users.add(chat.userId);
                });
                
                // Dapatkan info user
                const userPromises = Array.from(users).map(userId => {
                    return db.ref('users/' + userId).once('value')
                        .then((userSnapshot) => {
                            return {
                                id: userId,
                                ...userSnapshot.val()
                            };
                        });
                });
                
                Promise.all(userPromises)
                    .then((usersData) => {
                        chatList.innerHTML = '';
                        
                        usersData.forEach((user) => {
                            const chatUser = document.createElement('div');
                            chatUser.className = 'chat-user';
                            chatUser.setAttribute('data-id', user.id);
                            
                            chatUser.innerHTML = `
                                <div class="chat-user-name">${user.username}</div>
                                <div class="chat-user-status offline">Offline</div>
                            `;
                            
                            chatList.appendChild(chatUser);
                            
                            // Tambahkan event listener untuk memilih user
                            chatUser.addEventListener('click', function() {
                                selectChatUser(user.id, user.username);
                            });
                        });
                        
                        // Pilih user pertama jika ada
                        if (usersData.length > 0) {
                            selectChatUser(usersData[0].id, usersData[0].username);
                        }
                    });
            });
    }
}

// Fungsi untuk memilih user chat
function selectChatUser(userId, username) {
    const currentChatUser = document.getElementById('currentChatUser');
    const chatMessages = document.getElementById('adminChatMessages');
    const chatInput = document.getElementById('adminChatInput');
    const sendMessageBtn = document.getElementById('adminSendMessageBtn');
    
    // Set user yang dipilih
    currentChatUser.textContent = username;
    document.querySelector('.chat-user.active')?.classList.remove('active');
    document.querySelector(`.chat-user[data-id="${userId}"]`).classList.add('active');
    
    // Aktifkan input chat
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
    
    // Load pesan
    chatMessages.innerHTML = '';
    
    db.ref('chats').orderByChild('userId').equalTo(userId).on('value', (snapshot) => {
        chatMessages.innerHTML = '';
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push(childSnapshot.val());
        });
        
        // Urutkan berdasarkan tanggal
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Tampilkan pesan
        messages.forEach((message) => {
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${message.sender === 'admin' ? 'admin' : 'user'}`;
            
            messageElement.innerHTML = `
                <div class="message-bubble">
                    <p>${message.text}</p>
                    <div class="message-time">${formatTime(message.timestamp)}</div>
                </div>
            `;
            
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll ke bawah
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // Update status user (simulasi)
    const userStatus = document.querySelector(`.chat-user[data-id="${userId}"] .chat-user-status`);
    userStatus.textContent = 'Online';
    userStatus.classList.remove('offline');
    userStatus.classList.add('online');
}

// Fungsi untuk mengirim pesan sebagai admin
function sendAdminMessage() {
    const chatInput = document.getElementById('adminChatInput');
    const messageText = chatInput.value.trim();
    const currentUserId = document.querySelector('.chat-user.active')?.getAttribute('data-id');
    
    if (!messageText || !currentUserId) return;
    
    // Buat data pesan
    const messageId = db.ref().child('chats').push().key;
    const messageData = {
        id: messageId,
        userId: currentUserId,
        sender: 'admin',
        text: messageText,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // Simpan ke database
    db.ref(`chats/${messageId}`).set(messageData)
        .then(() => {
            chatInput.value = '';
            
            // Scroll ke bawah
            const chatMessages = document.getElementById('adminChatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch((error) => {
            alert(`Gagal mengirim pesan: ${error.message}`);
        });
}

// Fungsi untuk render grafik pendapatan
function renderIncomeChart() {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    // Data contoh - dalam implementasi nyata, ambil dari database
    const incomeData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'],
        datasets: [{
            label: 'Pendapatan',
            data: [5000000, 7500000, 6000000, 9000000, 8500000, 9500000, 11000000],
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: incomeData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatRupiahShort(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatRupiah(context.raw);
                        }
                    }
                }
            }
        }
    });
}

// Fungsi untuk render grafik paket investasi
function renderPackageChart() {
    const ctx = document.getElementById('packageChart').getContext('2d');
    
    // Data contoh - dalam implementasi nyata, ambil dari database
    const packageData = {
        labels: ['Pemula', 'Sedang', 'Pro', 'God'],
        datasets: [{
            data: [25, 40, 20, 15],
            backgroundColor: [
                'rgba(46, 204, 113, 0.7)',
                'rgba(52, 152, 219, 0.7)',
                'rgba(155, 89, 182, 0.7)',
                'rgba(241, 196, 15, 0.7)'
            ],
            borderColor: [
                'rgba(46, 204, 113, 1)',
                'rgba(52, 152, 219, 1)',
                'rgba(155, 89, 182, 1)',
                'rgba(241, 196, 15, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: packageData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// Fungsi untuk memuat aktivitas terbaru
function loadRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    
    if (activityContainer) {
        // Gabungkan data dari berbagai sumber (investasi, deposit, withdraw)
        const investmentsPromise = db.ref('investments').orderByChild('date').limitToLast(3).once('value');
        const depositsPromise = db.ref('deposits').orderByChild('date').limitToLast(3).once('value');
        const withdrawsPromise = db.ref('withdraws').orderByChild('date').limitToLast(3).once('value');
        
        Promise.all([investmentsPromise, depositsPromise, withdrawsPromise])
            .then(([investmentsSnap, depositsSnap, withdrawsSnap]) => {
                const activities = [];
                
                // Proses investasi
                investmentsSnap.forEach((childSnapshot) => {
                    const investment = childSnapshot.val();
                    activities.push({
                        type: 'investment',
                        user: investment.userId,
                        amount: investment.amount,
                        date: investment.startDate,
                        package: investment.packageName
                    });
                });
                
                // Proses deposit
                depositsSnap.forEach((childSnapshot) => {
                    const deposit = childSnapshot.val();
                    activities.push({
                        type: 'deposit',
                        user: deposit.userId,
                        amount: deposit.amount,
                        date: deposit.date
                    });
                });
                
                // Proses withdraw
                withdrawsSnap.forEach((childSnapshot) => {
                    const withdraw = childSnapshot.val();
                    activities.push({
                        type: 'withdraw',
                        user: withdraw.userId,
                        amount: withdraw.amount,
                        date: withdraw.date,
                        method: withdraw.method
                    });
                });
                
                // Urutkan berdasarkan tanggal terbaru
                activities.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Ambil 5 aktivitas terbaru
                const recentActivities = activities.slice(0, 5);
                
                // Tampilkan aktivitas
                activityContainer.innerHTML = '';
                
                if (recentActivities.length > 0) {
                    recentActivities.forEach((activity) => {
                        const activityElement = createActivityElement(activity);
                        activityContainer.appendChild(activityElement);
                    });
                } else {
                    activityContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-clock"></i>
                            <p>Belum ada aktivitas terbaru</p>
                        </div>
                    `;
                }
            });
    }
}

// Fungsi untuk membuat elemen aktivitas
function createActivityElement(activity) {
    const element = document.createElement('div');
    element.className = 'activity-item';
    
    let icon = '';
    let description = '';
    
    switch (activity.type) {
        case 'investment':
            icon = 'fas fa-chart-line';
            description = `Investasi ${activity.package}`;
            break;
        case 'deposit':
            icon = 'fas fa-arrow-down';
            description = 'Deposit';
            break;
        case 'withdraw':
            icon = 'fas fa-arrow-up';
            description = `Withdraw via ${activity.method}`;
            break;
        default:
            icon = 'fas fa-exchange-alt';
    }
    
    // Dapatkan username
    let username = 'User';
    db.ref('users/' + activity.user + '/username').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                username = snapshot.val();
            }
        });
    
    element.innerHTML = `
        <div class="activity-icon">
            <i class="${icon}"></i>
        </div>
        <div class="activity-info">
            <h4>${username} - ${description}</h4>
            <p>${formatRupiah(activity.amount)}</p>
        </div>
        <div class="activity-time">
            ${formatTime(activity.date)}
        </div>
    `;
    
    return element;
}

// Fungsi untuk setup tab
function setupTabs(modal) {
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Hapus active class dari semua tab
            tabBtns.forEach(tb => tb.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Tambahkan active class ke tab yang dipilih
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Fungsi untuk generate kode referral
function generateReferralCode() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
    }
    
    return code;
}

// Fungsi untuk format waktu
function formatTime(timestamp) {
    const options = { 
        hour: '2-digit', 
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
    };
    return new Date(timestamp).toLocaleDateString('id-ID', options);
}

// Fungsi untuk format rupiah (short)
function formatRupiahShort(amount) {
    if (amount >= 1000000) {
        return 'Rp' + (amount / 1000000).toFixed(1) + 'jt';
    } else if (amount >= 1000) {
        return 'Rp' + (amount / 1000).toFixed(1) + 'rb';
    }
    return 'Rp' + amount;
}

// Fungsi untuk format rupiah
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
