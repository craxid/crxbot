const { cekResiJNE } = require('../lib/resi');

// Fungsi helper untuk merapihkan tanggal
const formatTanggal = (tanggal) => {
    if (!tanggal || tanggal === '-') return tanggal;
    try {
        let [datePart, timePart] = tanggal.split(' ');
        let [d, m, y] = datePart.split('-');
        const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        let time = timePart.split(':').slice(0, 2).join(':'); // Ambil Jam & Menit saja
        
        return `${parseInt(d)} ${bulan[parseInt(m) - 1]} ${y} • ${time} WIB`;
    } catch (e) {
        return tanggal; // Kembalikan ke format asli jika ada error parsing
    }
};

// Fungsi helper untuk jeda (delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek apakah user memasukkan resi DAN nomor verify
    if (args.length < 2) {
        throw `Format salah!\n\n*Cara Penggunaan:*\n${usedPrefix + command} <nomor_resi> <5_angka_terakhir_no_hp>\n\n*Contoh:*\n${usedPrefix + command} BC26081000001502 99976`;
    }

    let resi = args[0];
    let verifyCode = args[1];

    // Validasi: pastikan verify code persis 5 angka
    if (!/^\d{5}$/.test(verifyCode)) {
        throw '⚠️ Kode verifikasi harus berupa tepat *5 angka* (diambil dari 5 angka terakhir nomor handphone penerima paket).';
    }

    // Kirim pesan awal dan simpan key-nya untuk diedit nanti
    let msg = await conn.reply(m.chat, '🔍 Sedang mengecek resi, mohon tunggu sebentar...', m);
    
    // Memberikan jeda 5 detik agar tidak spam / kena rate limit
    await sleep(5000);
    
    // Panggil scraper dengan 2 argumen
    let res = await cekResiJNE(resi, verifyCode);
    
    if (!res.success) {
        // Jika gagal, edit pesan awal menjadi pesan error
        return conn.sendMessage(m.chat, { text: res.message, edit: msg.key });
    }

    let d = res.data;
    
    // Tidak di-reverse, agar urutan dari JNE (terbaru di atas) tetap dipertahankan
    let historyArr = [...d.history];
    let historyStatus = historyArr.map((h, i) => {
        let isLast = i === historyArr.length - 1;
        if (isLast) {
            // Update paling lama (paling bawah) tidak butuh garis vertikal lagi
            return `◉ ${h.title}\n   ${formatTanggal(h.date)}`;
        } else {
            // Update yang lebih baru (di atas) diberi garis vertikal penghubung ke bawah
            return `◉ ${h.title}\n│  ${formatTanggal(h.date)}\n│`;
        }
    }).join('\n');

    // Teks balasan ke pengguna
    let capt = `📦 *INFORMASI PENGIRIMAN JNE*\n\n`
             + `*• No Resi:* ${d.resiNumber}\n`
             + `*• Status:* ${d.currentStatus}\n`
             + `*• Layanan:* ${d.service}\n`
             + `*• Tgl Kirim:* ${formatTanggal(d.shipmentDate)}\n\n`
             + `👤 *PENGIRIM*\n`
             + `*• Nama:* ${d.shipperName}\n`
             + `*• Asal:* ${d.shipperCity}\n\n`
             + `👥 *PENERIMA*\n`
             + `*• Nama:* ${d.receiverNameDetail}\n`
             + `*• Tujuan:* ${d.receiverCityDetail}\n\n`
             + `📋 *DETAIL BARANG*\n`
             + `*• Deskripsi:* ${d.goodDescription}\n`
             + `*• Berat:* ${d.weight}\n`
             + `*• Jumlah:* ${d.koli} Koli\n\n`
             + `📍 *RIWAYAT PENGIRIMAN*\n\n${historyStatus}`;

    // Edit pesan awal dengan hasil akhir & tambahkan tag "Diteruskan berkali-kali"
    await conn.sendMessage(m.chat, { 
        text: capt, 
        edit: msg.key,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true
        }
    });
}

handler.help = ['cekresijne <resi> <5_digit_no_hp>']
handler.tags = ['tools']
handler.command = /^(cekresijne|resijne|jne)$/i
handler.limit = true
handler.register = true

module.exports = handler;