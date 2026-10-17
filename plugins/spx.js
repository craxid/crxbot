const { cekSPX } = require('../lib/resapi.js');

// Fungsi helper untuk jeda (delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek apakah user memasukkan resi
    if (args.length < 1) {
        throw `Format salah!\n\n*Cara Penggunaan:*\n${usedPrefix + command} <nomor_resi>\n\n*Contoh:*\n${usedPrefix + command} SPXID067777764098`;
    }

    let resi = args[0].trim();

    // Kirim pesan awal dan simpan key-nya untuk diedit nanti
    let msg = await m.reply(wait);
    
    // Memberikan jeda 5 detik agar tidak spam / kena rate limit
    await sleep(5000);
    
    // Panggil scraper
    let res = await cekSPX(resi);
    
    if (!res.status) {
        // Jika gagal, edit pesan awal menjadi pesan error
        return conn.sendMessage(m.chat, { text: `❌ *Gagal:* ${res.message}`, edit: msg.key });
    }

    // Eksekusi mapping history
    let historyArr = [...res.history];
    let historyStatus = historyArr.map((h, i) => {
        let isLast = i === historyArr.length - 1;
        // Tambahkan keterangan lokasi jika API menyediakannya
        let locText = h.location ? ` (${h.location})` : '';
        
        if (isLast) {
            // Update paling lama (paling bawah) tidak butuh garis vertikal lagi
            return `◉ ${h.status}${locText}\n   ${h.time}`;
        } else {
            // Update yang lebih baru (di atas) diberi garis vertikal penghubung ke bawah
            return `◉ ${h.status}${locText}\n│  ${h.time}\n│`;
        }
    }).join('\n');

    // Teks balasan ke pengguna (Disesuaikan dengan data yang tersedia di API SPX)
    let capt = `📦 *CEK RESI SHOPEE EXPRESS*\n\n`
             + `*• No Resi:* ${res.resi}\n`
             + `*• Status:* ${res.current_status}\n`
             + `*• Update Terakhir:* ${res.last_update}\n\n`
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

handler.help = ['spx <resi>']
handler.tags = ['tools']
handler.command = /^(spx|cekresi)$/i
handler.limit = true
handler.register = true

module.exports = handler;