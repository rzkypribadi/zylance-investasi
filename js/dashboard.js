// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Cek user yang login
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Load data investasi aktif
            loadActiveInvestments(user.uid);
            
            // Load riwayat transaksi
            loadTransactionHistory(user.uid);
            
            // Reward harian
            setupDailyReward(user.uid);
            
            // Referral
            setupReferral(user.uid);
        }
    });
});

// Fungsi untuk memuat investasi aktif
function loadActiveInvestments(userId) {
    const investmentsContainer = document.getElementById('activeInvestments');
    
    if (investmentsContainer) {
        db.ref('users/' + userId + '/investments').on('value', (snapshot) => {
            const investments = snapshot.val();
            
            if (investments && Object.keys(investments).length > 0) {
                investmentsContainer.innerHTML = '';
                
                Object.entries(investments).forEach(([key, investment]) => {
                    if (investment.status === 'active') {
                        const investmentElement = createInvestmentElement(investment);
                        investmentsContainer.appendChild(investmentElement);
                    }
                });
            } else {
                investmentsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Anda belum memiliki investasi aktif</p>
                        <button class="btn-primary" onclick="location.href='invest.html'">Mulai Investasi</button>
                    </div>
                `;
            }
        });
    }
}

// Fungsi untuk membuat elemen investasi
function createInvestmentElement(investment) {
    const today = new Date();
    const endDate = new Date(investment.endDate);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    const element = document.createElement('div');
    element.className = 'investment-item';
    
    element.innerHTML = `
        <div class="investment-header">
            <h4>${investment.packageName}</h4>
            <span class="investment-status">Aktif</span>
        </div>
        <div class="investment-body">
            <div class="investment-detail">
                <span>Mulai:</span>
                <span>${formatDate(investment.startDate)}</span>
            </div>
            <div class="investment-detail">
                <span>Selesai:</span>
                <span>${formatDate(investment.endDate)}</span>
            </div>
            <div class="investment-detail">
                <span>Hari Tersisa:</span>
                <span>${daysLeft > 0 ? daysLeft : 0} hari</span>
            </div>
            <div class="investment-detail">
                <span>Klaim Hari Ini:</span>
                <span>${formatRupiah(investment.dailyProfit)}</span>
            </div>
        </div>
        <div class="investment-footer">
            <button class="btn-primary claim-btn" data-id="${investment.id}">Klaim</button>
        </div>
    `;
    
    // Tambahkan event listener untuk tombol klaim
    element.querySelector('.claim-btn').addEventListener('click', function() {
        claimDailyProfit(this.getAttribute('data-id'));
    });
    
    return element;
}

// Fungsi untuk memuat riwayat transaksi
function loadTransactionHistory(userId) {
    const historyContainer = document.getElementById('transactionHistory');
    
    if (historyContainer) {
        db.ref('users/' + userId + '/transactions').limitToLast(5).on('value', (snapshot) => {
            const transactions = snapshot.val();
            
            if (transactions && Object.keys(transactions).length > 0) {
                historyContainer.innerHTML = '';
                
                Object.entries(transactions).reverse().forEach(([key, transaction]) => {
                    const transactionElement = createTransactionElement(transaction);
                    historyContainer.appendChild(transactionElement);
                });
            } else {
                historyContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Belum ada riwayat transaksi</p>
                    </div>
                `;
            }
        });
    }
}

// Fungsi untuk membuat elemen transaksi
function createTransactionElement(transaction) {
    const element = document.createElement('div');
    element.className = 'transaction-item';
    
    let icon = '';
    let color = '';
    
    switch (transaction.type) {
        case 'deposit':
            icon = 'fas fa-arrow-down';
            color = 'text-success';
            break;
        case 'withdraw':
            icon = 'fas fa-arrow-up';
            color = 'text-danger';
            break;
        case 'investment':
            icon = 'fas fa-chart-line';
            color = 'text-primary';
            break;
        case 'profit':
            icon = 'fas fa-coins';
            color = 'text-warning';
            break;
        default:
            icon = 'fas fa-exchange-alt';
            color = 'text-info';
    }
    
    element.innerHTML = `
        <div class="transaction-icon ${color}">
            <i class="${icon}"></i>
        </div>
        <div class="transaction-info">
            <h5>${transaction.description}</h5>
            <p class="text-muted">${formatDateTime(transaction.date)}</p>
        </div>
        <div class="transaction-amount ${color}">
            ${transaction.type === 'withdraw' ? '-' : '+'} ${formatRupiah(transaction.amount)}
        </div>
    `;
    
    return element;
}

// Fungsi untuk setup reward harian
function setupDailyReward(userId) {
    const dailyRewardBtn = document.getElementById('dailyRewardBtn');
    
    if (dailyRewardBtn) {
        dailyRewardBtn.addEventListener('click', function() {
            // Cek apakah hari ini sudah klaim
            const today = new Date().toDateString();
            db.ref('users/' + userId + '/lastDailyReward').once('value')
                .then((snapshot) => {
                    const lastClaimDate = snapshot.val();
                    
                    if (lastClaimDate && new Date(lastClaimDate).toDateString() === today) {
                        alert('Anda sudah mengklaim reward harian hari ini!');
                    } else {
                        // Tambahkan reward
                        const rewardAmount = 5000;
                        
                        db.ref('users/' + userId).transaction((user) => {
                            if (user) {
                                user.balance = (user.balance || 0) + rewardAmount;
                                user.lastDailyReward = new Date().toISOString();
                                
                                // Catat transaksi
                                const transactionId = db.ref().child('transactions').push().key;
                                user.transactions = user.transactions || {};
                                user.transactions[transactionId] = {
                                    type: 'reward',
                                    amount: rewardAmount,
                                    description: 'Reward Harian',
                                    date: new Date().toISOString()
                                };
                            }
                            return user;
                        }).then(() => {
                            alert(`Anda mendapatkan reward harian sebesar ${formatRupiah(rewardAmount)}!`);
                        }).catch((error) => {
                            alert(`Gagal mengklaim reward: ${error.message}`);
                        });
                    }
                });
        });
    }
}

// Fungsi untuk setup referral
function setupReferral(userId) {
    const referralBtn = document.getElementById('referralBtn');
    
    if (referralBtn) {
        referralBtn.addEventListener('click', function() {
            // Dapatkan kode referral user
            db.ref('users/' + userId + '/referralCode').once('value')
                .then((snapshot) => {
                    const referralCode = snapshot.val();
                    
                    if (referralCode) {
                        const referralLink = `${window.location.origin}/register.html?ref=${referralCode}`;
                        
                        // Tampilkan modal dengan link referral
                        alert(`Bagikan link berikut untuk mendapatkan bonus referral:\n\n${referralLink}\n\n1 referral = Rp 15.000`);
                    }
                });
        });
    }
}

// Fungsi untuk klaim profit harian
function claimDailyProfit(investmentId) {
    const userId = auth.currentUser.uid;
    const today = new Date().toDateString();
    
    db.ref('users/' + userId + '/investments/' + investmentId).once('value')
        .then((snapshot) => {
            const investment = snapshot.val();
            
            if (investment) {
                // Cek apakah hari ini sudah diklaim
                const lastClaimDate = investment.lastClaim ? new Date(investment.lastClaim).toDateString() : null;
                
                if (lastClaimDate === today) {
                    alert('Anda sudah mengklaim profit hari ini!');
                    return;
                }
                
                // Cek apakah investasi masih aktif
                const endDate = new Date(investment.endDate);
                if (new Date() > endDate) {
                    alert('Masa investasi sudah selesai!');
                    return;
                }
                
                // Klaim profit
                const profitAmount = investment.dailyProfit;
                
                db.ref().transaction((data) => {
                    if (data) {
                        // Update saldo user
                        data.users[userId].balance = (data.users[userId].balance || 0) + profitAmount;
                        
                        // Update status klaim terakhir
                        data.users[userId].investments[investmentId].lastClaim = new Date().toISOString();
                        
                        // Catat transaksi
                        const transactionId = db.ref().child('transactions').push().key;
                        data.users[userId].transactions = data.users[userId].transactions || {};
                        data.users[userId].transactions[transactionId] = {
                            type: 'profit',
                            amount: profitAmount,
                            description: `Profit harian ${investment.packageName}`,
                            date: new Date().toISOString()
                        };
                    }
                    return data;
                }).then(() => {
                    alert(`Anda berhasil mengklaim profit sebesar ${formatRupiah(profitAmount)}!`);
                }).catch((error) => {
                    alert(`Gagal mengklaim profit: ${error.message}`);
                });
            }
        });
}

// Fungsi untuk format tanggal
function formatDate(dateString) {
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Fungsi untuk format tanggal dan waktu
function formatDateTime(dateString) {
    const options = { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Fungsi untuk format rupiah
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
