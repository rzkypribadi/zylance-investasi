// Impor modul yang diperlukan
import { auth, db } from './firebase-config.js';

// Elemen UI notifikasi
const loncengNotifikasi = document.getElementById('lonceng-notifikasi');
const hitungNotifikasi = document.getElementById('hitung-notifikasi');
const daftarNotifikasi = document.getElementById('daftar-notifikasi');

/* 
 * Fungsi untuk menginisialisasi sistem notifikasi
 * Dipanggil saat halaman dimuat
 */
export function initNotifikasi() {
    // Cek apakah user sudah login
    if (!auth.currentUser) return;

    /*
     * Mendengarkan perubahan data notifikasi
     * dari Firebase Realtime Database
     */
    db.ref(`users/${auth.currentUser.uid}/notifikasi`)
        .orderByChild('dibaca')
        .equalTo(false)
        .on('value', (snapshot) => {
            // Hitung notifikasi yang belum dibaca
            const jumlah = snapshot.numChildren();
            updateTampilanNotifikasi(jumlah);
            
            // Jika ada notifikasi baru
            if (jumlah > 0) {
                tampilkanNotifikasiPopup(jumlah);
            }
        });
}

// Fungsi untuk memperbarui tampilan notifikasi
function updateTampilanNotifikasi(jumlah) {
    if (jumlah > 0) {
        hitungNotifikasi.textContent = jumlah;
        hitungNotifikasi.style.display = 'block';
        loncengNotifikasi.classList.add('ada-notifikasi');
    } else {
        hitungNotifikasi.style.display = 'none';
        loncengNotifikasi.classList.remove('ada-notifikasi');
    }
}

/* 
 * Fungsi untuk menampilkan popup notifikasi
 * @param {number} jumlah - Jumlah notifikasi baru
 */
function tampilkanNotifikasiPopup(jumlah) {
    // Buat elemen popup
    const popup = document.createElement('div');
    popup.className = 'popup-notifikasi';
    popup.innerHTML = `
        <p>Anda memiliki ${jumlah} notifikasi baru</p>
        <button class="btn-tutup">Tutup</button>
    `;

    // Tambahkan event listener untuk tombol tutup
    popup.querySelector('.btn-tutup').addEventListener('click', () => {
        popup.remove();
    });

    // Tambahkan popup ke DOM
    document.body.appendChild(popup);

    // Hapus otomatis setelah 5 detik
    setTimeout(() => {
        popup.remove();
    }, 5000);
}

// Fungsi untuk menandai notifikasi sebagai sudah dibaca
export function tandaiSudahDibaca(notifikasiId) {
    db.ref(`users/${auth.currentUser.uid}/notifikasi/${notifikasiId}`)
        .update({ dibaca: true });
          }
