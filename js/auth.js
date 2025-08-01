// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

// Fungsi untuk menangani login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Jika form login ada di halaman
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const usernameOrEmail = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            // Cek apakah input adalah email atau username
            const isEmail = usernameOrEmail.includes('@');
            
            if (isEmail) {
                // Login dengan email
                auth.signInWithEmailAndPassword(usernameOrEmail, password)
                    .then((userCredential) => {
                        // Login berhasil
                        const user = userCredential.user;
                        window.location.href = 'dashboard.html';
                    })
                    .catch((error) => {
                        // Tangani error
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        alert(`Login gagal: ${errorMessage}`);
                    });
            } else {
                // Login dengan username - perlu query ke database
                db.ref('users').orderByChild('username').equalTo(usernameOrEmail).once('value')
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            const userData = snapshot.val();
                            const userId = Object.keys(userData)[0];
                            const email = userData[userId].email;
                            
                            // Login dengan email yang ditemukan
                            auth.signInWithEmailAndPassword(email, password)
                                .then((userCredential) => {
                                    // Login berhasil
                                    window.location.href = 'dashboard.html';
                                })
                                .catch((error) => {
                                    alert(`Login gagal: ${error.message}`);
                                });
                        } else {
                            alert('Username tidak ditemukan');
                        }
                    })
                    .catch((error) => {
                        alert(`Error: ${error.message}`);
                    });
            }
        });
    }
    
    // Jika form register ada di halaman
    if (registerForm) {
        // Generate CAPTCHA
        generateCaptcha();
        
        // Refresh CAPTCHA
        const refreshCaptcha = document.getElementById('refreshCaptcha');
        if (refreshCaptcha) {
            refreshCaptcha.addEventListener('click', generateCaptcha);
        }
        
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validasi CAPTCHA
            const userCaptcha = document.getElementById('userCaptcha').value;
            const captchaText = document.getElementById('captchaText').textContent;
            
            if (userCaptcha !== captchaText) {
                alert('Kode CAPTCHA tidak sesuai!');
                generateCaptcha();
                return;
            }
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const phone = document.getElementById('registerPhone').value;
            const password = document.getElementById('registerPassword').value;
            const referralCode = document.getElementById('registerReferral').value;
            
            // Buat akun dengan email dan password
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Registrasi berhasil
                    const user = userCredential.user;
                    
                    // Simpan data user ke database
                    const userData = {
                        username: username,
                        email: email,
                        phone: phone,
                        balance: 0,
                        referralCode: generateReferralCode(),
                        referredBy: referralCode || null,
                        joinDate: new Date().toISOString(),
                        investments: {},
                        transactions: {}
                    };
                    
                    db.ref('users/' + user.uid).set(userData)
                        .then(() => {
                            // Jika ada kode referral, update data referral
                            if (referralCode) {
                                processReferral(referralCode, user.uid);
                            }
                            
                            // Redirect ke dashboard
                            window.location.href = 'dashboard.html';
                        })
                        .catch((error) => {
                            alert(`Gagal menyimpan data user: ${error.message}`);
                        });
                })
                .catch((error) => {
                    // Tangani error
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    alert(`Registrasi gagal: ${errorMessage}`);
                });
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                alert(`Gagal logout: ${error.message}`);
            });
        });
    }
    
    // Cek status login
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User sudah login
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('register.html')) {
                window.location.href = 'dashboard.html';
            }
            
            // Tampilkan username di dashboard
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                db.ref('users/' + user.uid).once('value')
                    .then((snapshot) => {
                        const userData = snapshot.val();
                        if (userData && userData.username) {
                            usernameDisplay.textContent = userData.username;
                        }
                    });
            }
            
            // Update saldo
            updateBalanceDisplay(user.uid);
        } else {
            // User belum login
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('register.html')) {
                window.location.href = 'login.html';
            }
        }
    });
});

// Fungsi untuk generate CAPTCHA
function generateCaptcha() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let captcha = '';
    
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        captcha += chars[randomIndex];
    }
    
    const captchaText = document.getElementById('captchaText') || document.getElementById('depositCaptchaText');
    if (captchaText) {
        captchaText.textContent = captcha;
    }
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

// Fungsi untuk proses referral
function processReferral(referralCode, newUserId) {
    // Cari user dengan referral code tersebut
    db.ref('users').orderByChild('referralCode').equalTo(referralCode).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const referrerData = snapshot.val();
                const referrerId = Object.keys(referrerData)[0];
                
                // Update data referrer
                const updates = {};
                updates[`users/${referrerId}/referrals/${newUserId}`] = new Date().toISOString();
                
                // Tambahkan bonus referral
                let bonus = 15000; // Bonus default untuk 1 referral
                
                // Cek jumlah referral sebelumnya untuk menentukan bonus
                if (referrerData[referrerId].referrals) {
                    const referralCount = Object.keys(referrerData[referrerId].referrals).length;
                    
                    if (referralCount === 1) {
                        bonus = 40000 - 15000; // Total 40k untuk 2 referral
                    } else if (referralCount === 2) {
                        bonus = 70000 - 40000; // Total 70k untuk 3 referral
                    } else if (referralCount === 3) {
                        bonus = 100000 - 70000; // Total 100k untuk 4 referral
                    } else if (referralCount >= 4) {
                        bonus = 30000; // 30k per referral setelah 4
                    }
                }
                
                updates[`users/${referrerId}/balance`] = (referrerData[referrerId].balance || 0) + bonus;
                
                // Update database
                db.ref().update(updates)
                    .then(() => {
                        console.log('Referral berhasil diproses');
                    })
                    .catch((error) => {
                        console.error('Gagal memproses referral:', error);
                    });
            }
        });
}

// Fungsi untuk update tampilan saldo
function updateBalanceDisplay(userId) {
    const balanceElements = document.querySelectorAll('#userBalance, #mainBalance');
    
    if (balanceElements.length > 0 && userId) {
        db.ref('users/' + userId + '/balance').on('value', (snapshot) => {
            const balance = snapshot.val() || 0;
            
            balanceElements.forEach(element => {
                element.textContent = formatRupiah(balance);
            });
        });
    }
}

// Fungsi untuk format rupiah
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
