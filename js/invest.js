// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Daftar paket investasi
    const investmentPackages = {
        pemula: {
            name: 'Invest Money Pemula',
            price: 150000,
            dailyProfit: 70000,
            duration: 15,
            totalProfit: 1050000
        },
        sedang: {
            name: 'Invest Money Sedang',
            price: 250000,
            dailyProfit: 150000,
            duration: 20,
            totalProfit: 3000000
        },
        pro: {
            name: 'Invest Money Pro',
            price: 350000,
            dailyProfit: 200000,
            duration: 30,
            totalProfit: 6000000
        },
        god: {
            name: 'Invest Money God',
            price: 500000,
            dailyProfit: 300000,
            duration: 35,
            totalProfit: 10500000
        }
    };
    
    // Tombol beli paket
    const investButtons = document.querySelectorAll('.invest-btn');
    
    investButtons.forEach(button => {
        button.addEventListener('click', function() {
            const packageId = this.getAttribute('data-package');
            const packagePrice = parseInt(this.getAttribute('data-price'));
            const packageData = investmentPackages[packageId];
            
            // Tampilkan modal konfirmasi
            showInvestmentModal(packageData, packagePrice);
        });
    });
    
    // Konfirmasi investasi
    const confirmInvestBtn = document.getElementById('confirmInvest');
    if (confirmInvestBtn) {
        confirmInvestBtn.addEventListener('click', function() {
            const packageData = JSON.parse(this.getAttribute('data-package'));
            processInvestment(packageData);
        });
    }
});

// Fungsi untuk menampilkan modal investasi
function showInvestmentModal(packageData, packagePrice) {
    const modal = document.getElementById('investModal');
    const modalTitle = document.getElementById('modalInvestTitle');
    const packageName = document.getElementById('packageName');
    const packagePriceDisplay = document.getElementById('packagePrice');
    const currentBalance = document.getElementById('currentBalance');
    
    // Set data modal
    modalTitle.textContent = `Konfirmasi Investasi ${packageData.name}`;
    packageName.textContent = packageData.name;
    packagePriceDisplay.textContent = formatRupiah(packagePrice);
    
    // Dapatkan saldo user
    const userId = auth.currentUser.uid;
    db.ref('users/' + userId + '/balance').once('value')
        .then((snapshot) => {
            const balance = snapshot.val() || 0;
            currentBalance.textContent = formatRupiah(balance);
            
            // Set data package ke tombol konfirmasi
            document.getElementById('confirmInvest').setAttribute('data-package', JSON.stringify(packageData));
            
            // Tampilkan modal
            modal.style.display = 'flex';
            
            // Tutup modal
            const closeBtn = modal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        });
}

// Fungsi untuk memproses investasi
function processInvestment(packageData) {
    const userId = auth.currentUser.uid;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    if (!agreeTerms) {
        alert('Anda harus menyetujui syarat dan ketentuan!');
        return;
    }
    
    // Buat ID investasi
    const investmentId = db.ref().child('investments').push().key;
    
    // Hitung tanggal mulai dan selesai
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + packageData.duration);
    
    // Buat data investasi
    const investment = {
        id: investmentId,
        userId: userId,
        packageName: packageData.name,
        packageType: packageData.type,
        amount: packageData.price,
        dailyProfit: packageData.dailyProfit,
        totalProfit: packageData.totalProfit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
        lastClaim: null
    };
    
    // Update database
    const updates = {};
    updates[`investments/${investmentId}`] = investment;
    updates[`users/${userId}/investments/${investmentId}`] = investment;
    
    // Catat transaksi
    updates[`users/${userId}/transactions/${investmentId}`] = {
        type: 'investment',
        amount: packageData.price,
        description: `Investasi ${packageData.name}`,
        date: new Date().toISOString()
    };
    
    // Kurangi saldo user
    db.ref('users/' + userId).transaction((user) => {
        if (user) {
            if ((user.balance || 0) >= packageData.price) {
                user.balance = (user.balance || 0) - packageData.price;
            } else {
                throw new Error('Saldo tidak mencukupi');
            }
        }
        return user;
    }).then(() => {
        return db.ref().update(updates);
    }).then(() => {
        alert(`Investasi ${packageData.name} berhasil dibeli!`);
        window.location.href = 'dashboard.html';
    }).catch((error) => {
        alert(`Gagal memproses investasi: ${error.message}`);
    });
}

// Fungsi untuk format rupiah
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
