// Impor modul yang diperlukan
import { auth, db } from './firebase-config.js';
import { formatRupiah, formatTanggal } from './utils.js';

/*
 * Fungsi untuk memuat riwayat transaksi
 * @param {number} limit - Jumlah maksimal transaksi yang ditampilkan
 */
export function muatRiwayatTransaksi(limit = 10) {
    // Cek apakah user sudah login
    if (!auth.currentUser) return;

    // Dapatkan referensi ke data transaksi
    const refTransaksi = db.ref(`users/${auth.currentUser.uid}/transaksi`)
        .orderByChild('tanggal')
        .limitToLast(limit);

    // Mendengarkan perubahan data
    refTransaksi.on('value', (snapshot) => {
        const container = document.getElementById('daftar-transaksi');
        if (!container) return;

        container.innerHTML = '';

        snapshot.forEach((childSnapshot) => {
            const transaksi = childSnapshot.val();
            tambahItemTransaksi(container, transaksi);
        });
    });
}

/*
 * Fungsi untuk menambahkan item transaksi ke DOM
 * @param {HTMLElement} container - Container untuk menampung item
 * @param {object} transaksi - Data transaksi
 */
function tambahItemTransaksi(container, transaksi) {
    const item = document.createElement('div');
    item.className = `item-transaksi ${transaksi.jenis}`;

    // Tentukan ikon berdasarkan jenis transaksi
    let icon, warna;
    switch(transaksi.jenis) {
        case 'deposit':
            icon = 'arrow-down';
            warna = 'hijau';
            break;
        case 'withdraw':
            icon = 'arrow-up';
            warna = 'merah';
            break;
        default:
            icon = 'exchange-alt';
            warna = 'biru';
    }

    item.innerHTML = `
        <div class="icon-transaksi ${warna}">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="detail-transaksi">
            <h5>${transaksi.keterangan}</h5>
            <p>${formatTanggal(transaksi.tanggal)}</p>
        </div>
        <div class="jumlah-transaksi">
            ${transaksi.jenis === 'withdraw' ? '-' : '+'} 
            ${formatRupiah(transaksi.jumlah)}
        </div>
    `;

    container.appendChild(item);
}
