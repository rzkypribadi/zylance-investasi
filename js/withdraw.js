// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Daftar metode pembayaran
    const paymentMethods = {
        ewallet: ['DANA', 'OVO', 'Gopay', 'ShopeePay', 'LinkAja'],
        bank: ['BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga']
    };
    
    const withdrawMethod = document.getElementById('withdrawMethod');
    const paymentMethodGroup = document.getElementById('paymentMethodGroup');
    const paymentMethod = document.getElementById('paymentMethod');
    const minWithdrawText = document.getElementById('minWithdrawText');
    
    // Update pilihan metode pembayaran berdasarkan jenis withdraw
    if (withdrawMethod && paymentMethod) {
        withdrawMethod.addEventListener('change', function() {
            const method = this.value;
            
            if (method) {
                paymentMethodGroup.style.display = 'block';
                paymentMethod.innerHTML = '<option value="">Pilih metode</option>';
                
                paymentMethods[method].forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.toLowerCase();
                    opt.textContent = option;
                    paymentMethod.appendChild(opt);
                });
            } else {
                paymentMethodGroup.style.display = 'none';
            }
        });
    }
    
    // Update minimal withdraw berdasarkan saldo
    const userId = auth.currentUser.uid;
    if (userId && minWithdrawText) {
        db.ref('users/' + userId + '/balance').on('value', (snapshot) => {
            const balance = snapshot.val() || 0;
            let minWithdraw = 700000; // Default
            
            if (balance >= 500000 && balance < 1000000) {
                minWithdraw = 700000;
            } else if (balance >= 1000000 && balance < 2000000) {
                minWithdraw = 2000000;
            } else if (balance >= 2000000 && balance < 3000000) {
                minWithdraw = 4000000;
            } else if (balance >= 3000000) {
                minWithdraw = balance + 1000000;
            }
            
            minWithdrawText.textContent = `Minimal withdraw: ${formatRupiah(minWithdraw)}`;
        });
    }
    
    // Form withdraw
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const method = withdrawMethod.value;
            const payment = paymentMethod.value;
            const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
            const password = document.getElementById('withdrawPassword').value;
            
            // Validasi
            if (!method || !payment) {
                alert('Pilih metode withdraw dan pembayaran!');
                return;
            }
            
            if (amount < 700000) {
                alert(`Minimal withdraw adalah Rp 700.000`);
                return;
            }
            
            // Konfirmasi withdraw
            showWithdrawConfirmation(method, payment, amount);
        });
    }
    
    // Load riwayat withdraw
    loadWithdrawHistory(userId);
});

// Fungsi untuk menampilkan konfirmasi withdraw
function showWithdrawConfirmation(method, payment, amount) {
    const modal = document.getElementById('withdrawModal');
    const confirmMethod = document.getElementById('confirmMethod');
    const confirmPayment = document.getElementById('confirmPayment');
    const confirmAmount = document.getElementById('confirmAmount');
    
    // Set data konfirmasi
    confirmMethod.textContent = method === 'ewallet' ? 'E-Wallet' : 'Bank Transfer';
    confirmPayment.textContent = payment.toUpperCase();
    confirmAmount.textContent = formatRupiah(amount);
    
    // Tampilkan modal
    modal.style.display = 'flex';
    
    // Tutup modal
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Konfirmasi akhir
    const finalConfirmBtn = document.getElementById('finalConfirmWithdraw');
    finalConfirmBtn.addEventListener('click', function() {
        processWithdraw(method, payment, amount);
        modal.style.display = 'none';
    });
}

// Fungsi untuk memproses withdraw
function processWithdraw(method, payment, amount) {
    const userId = auth.currentUser.uid;
    
    // Buat data withdraw
    const withdrawId = db.ref().child('withdraws').push().key;
    const withdrawData = {
        userId: userId,
        method: method,
        payment: payment,
        amount: amount,
        status: 'pending',
        date: new Date().toISOString(),
        processedDate: null
    };
    
    // Update database
    const updates = {};
    updates[`withdraws/${withdrawId}`] = withdrawData;
    updates[`users/${userId}/transactions/${withdrawId}`] = {
        type: 'withdraw',
        amount: amount,
        description: `Withdraw ke ${payment.toUpperCase()}`,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    // Kurangi saldo user
    db.ref('users/' + userId).transaction((user) => {
        if (user) {
            if ((user.balance || 0) >= amount) {
                user.balance = (user.balance || 0) - amount;
            } else {
                throw new Error('Saldo tidak mencukupi');
            }
        }
        return user;
    }).then(() => {
        return db.ref().update(updates);
    }).then(() => {
        alert(`Withdraw sebesar ${formatRupiah(amount)} berhasil diajukan. Akan diproses dalam 1x24 jam.`);
    }).catch((error) => {
        alert(`Gagal memproses withdraw: ${error.message}`);
    });
}

// Fungsi untuk memuat riwayat withdraw
function loadWithdrawHistory(userId) {
    const historyContainer = document.getElementById('withdrawHistory');
    
    if (historyContainer) {
        db.ref('withdraws').orderByChild('userId').equalTo(userId).limitToLast(5).on('value', (snapshot) => {
            const withdraws = snapshot.val();
            
            if (withdraws && Object.keys(withdraws).length > 0) {
                historyContainer.innerHTML = '';
                
                Object.entries(withdraws).reverse().forEach(([key, withdraw]) => {
                    const withdrawElement = createWithdrawElement(withdraw);
                    historyContainer.appendChild(withdrawElement);
                });
            } else {
                historyContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Belum ada riwayat withdraw</p>
                    </div>
                `;
            }
        });
    }
}

// Fungsi untuk membuat elemen withdraw
function createWithdrawElement(withdraw) {
    const element = document.createElement('div');
    element.className = 'history-item';
    
    let statusClass = '';
    switch (withdraw.status) {
        case 'pending':
            statusClass = 'text-warning';
            break;
        case 'completed':
            statusClass = 'text-success';
            break;
        case 'rejected':
            statusClass = 'text-danger';
            break;
        default:
            statusClass = 'text-info';
    }
    
    element.innerHTML = `
        <div class="history-icon">
            <i class="fas fa-money-bill-wave"></i>
        </div>
        <div class="history-info">
            <h5>Withdraw ke ${withdraw.payment.toUpperCase()}</h5>
            <p class="text-muted">${formatDateTime(withdraw.date)}</p>
            <span class="status-badge ${statusClass}">${withdraw.status}</span>
        </div>
        <div class="history-amount">
            - ${formatRupiah(withdraw.amount)}
        </div>
    `;
    
    return element;
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
