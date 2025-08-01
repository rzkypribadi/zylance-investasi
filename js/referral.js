// Impor fungsi dari Firebase
import { auth, db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Cek parameter referral di URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    // Jika ada kode referral di URL, isi field referral
    if (referralCode) {
        const referralInput = document.getElementById('registerReferral');
        if (referralInput) {
            referralInput.value = referralCode;
            referralInput.readOnly = true;
        }
    }
    
    // Validasi referral code saat form register di-submit
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const referralCode = document.getElementById('registerReferral').value;
            
            if (referralCode) {
                // Validasi referral code
                validateReferralCode(referralCode)
                    .catch(() => {
                        alert('Kode referral tidak valid!');
                        e.preventDefault();
                    });
            }
        });
    }
});

// Fungsi untuk validasi referral code
function validateReferralCode(code) {
    return new Promise((resolve, reject) => {
        db.ref('users').orderByChild('referralCode').equalTo(code).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    resolve();
                } else {
                    reject();
                }
            })
            .catch(() => reject());
    });
}
