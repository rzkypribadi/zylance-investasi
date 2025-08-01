// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Pilihan nominal deposit
    const amountOptions = document.querySelectorAll('.amount-option');
    const customAmountInput = document.getElementById('customAmount');
    const proceedBtn = document.getElementById('proceedDeposit');
    
    let selectedAmount = 0;
    
    // Tambahkan event listener untuk pilihan nominal
    amountOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Hapus active class dari semua opsi
            amountOptions.forEach(opt => opt.classList.remove('active'));
            
            // Tambahkan active class ke opsi yang dipilih
            this.classList.add('active');
            
            // Set selected amount
            selectedAmount = parseInt(this.getAttribute('data-amount'));
            
            // Reset custom amount
            customAmountInput.value = '';
        });
    });
    
    // Custom amount
    customAmountInput.addEventListener('input', function() {
        const amount = parseInt(this.value) || 0;
        
        // Hapus active class dari semua opsi
        amountOptions.forEach(opt => opt.classList.remove('active'));
        
        // Set selected amount
        selectedAmount = amount >= 150000 ? amount : 0;
    });
    
    // Tombol lanjutkan
    proceedBtn.addEventListener('click', function() {
        if (selectedAmount < 150000) {
            alert('Minimal deposit adalah Rp 150.000');
            return;
        }
        
        // Tampilkan modal konfirmasi
        showDepositModal(selectedAmount);
    });
    
    // Form deposit
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        // Generate CAPTCHA untuk deposit
        generateCaptcha();
        
        // Refresh CAPTCHA
        const refreshCaptcha = document.getElementById('refreshDepositCaptcha');
        if (refreshCaptcha) {
            refreshCaptcha.addEventListener('click', generateCaptcha);
        }
        
        depositForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validasi CAPTCHA
            const userCaptcha = document.getElementById('depositCaptcha').value;
            const captchaText = document.getElementById('depositCaptchaText').textContent;
            
            if (userCaptcha !== captchaText) {
                alert('Kode CAPTCHA tidak sesuai!');
                generateCaptcha();
                return;
            }
            
            // Dapatkan data user
            const userId = auth.currentUser.uid;
            const name = document.getElementById('depositName').value;
            const email = document.getElementById('depositEmail').value;
            const phone = document.getElementById('depositPhone').value;
            
            // Buat data deposit
            const depositId = db.ref().child('deposits').push().key;
            const depositData = {
                userId: userId,
                amount: selectedAmount,
                name: name,
                email: email,
                phone: phone,
                status: 'pending',
                date: new Date().toISOString()
            };
            
            // Simpan ke database
            const updates = {};
            updates[`deposits/${depositId}`] = depositData;
            updates[`users/${userId}/transactions/${depositId}`] = {
                type: 'deposit',
                amount: selectedAmount,
                description: 'Deposit',
                status: 'pending',
                date: new Date().toISOString()
            };
            
            db.ref().update(updates)
                .then(() => {
                    // Redirect ke halaman pembayaran
                    window.location.href = `payment.html?depositId=${depositId}&amount=${selectedAmount}`;
                })
                .catch((error) => {
                    alert(`Gagal memproses deposit: ${error.message}`);
                });
        });
    }
});

// Fungsi untuk menampilkan modal deposit
function showDepositModal(amount) {
    const modal = document.getElementById('confirmModal');
    const amountDisplay = modal.querySelector('#paymentAmount');
    
    // Set jumlah deposit
    amountDisplay.textContent = formatRupiah(amount);
    
    // Tampilkan modal
    modal.style.display = 'flex';
    
    // Tutup modal
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Isi data user jika sudah login
    const userId = auth.currentUser.uid;
    if (userId) {
        db.ref('users/' + userId).once('value')
            .then((snapshot) => {
                const userData = snapshot.val();
                
                if (userData) {
                    document.getElementById('depositName').value = userData.username || '';
                    document.getElementById('depositEmail').value = userData.email || '';
                    document.getElementById('depositPhone').value = userData.phone || '';
                }
            });
    }
}

// Fungsi untuk generate CAPTCHA
function generateCaptcha() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let captcha = '';
    
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        captcha += chars[randomIndex];
    }
    
    const captchaText = document.getElementById('depositCaptchaText');
    if (captchaText) {
        captchaText.textContent = captcha;
    }
}

// Fungsi untuk format rupiah
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
