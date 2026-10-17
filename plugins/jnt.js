const { cekJNT } = require('../lib/resapi.js');

// Fungsi helper untuk jeda (delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek apakah user memasukkan resi + 4 digit no hp
    if (args.length < 2) {
        throw `Format salah!\n\n*Cara Penggunaan:*\n${usedPrefix + command} <nomor_resi> <4_digit_no_hp>\n\n*Contoh:*\n${usedPrefix + command} JY1965478346 4104\n\n_4 digit terakhir nomor HP penerima/pengirim (sama kayak verifikasi di web J&T)_`;
    }

    let resi = args[0].trim();
    let phone4 = args[1].trim();

    // Kirim pesan awal dan simpan key-nya untuk diedit nanti
    let msg = await m.reply(wait);

    // Memberikan jeda 5 detik agar tidak spam / kena rate limit
    await sleep(5000);

    // Panggil scraper
    let res = await cekJNT(resi, phone4);

    if (!res.status) {
        // Jika gagal, edit pesan awal menjadi pesan error
        return conn.sendMessage(m.chat, { text: `❌ *Gagal:* ${res.message}`, edit: msg.key });
    }

    // Eksekusi mapping history (data lengkap: status, lokasi, kota, waktu, deskripsi)
    let historyArr = [...res.history];
    let historyStatus = historyArr.map((h, i) => {
        let isLast = i === historyArr.length - 1;
        // Gabungkan lokasi + kota jika ada
        let loc = [h.location, h.city].filter(Boolean).join(', ');
        let locText = loc ? ` (${loc})` : '';
        // Deskripsi lengkap dari API (misal: "Package will be departed to...")
        let descText = h.description ? `\n   _${h.description}_` : '';

        let block = `◉ ${h.status}${locText}\n   ${h.time}${descText}`;
        // Update yang lebih baru (di atas) diberi garis vertikal penghubung ke bawah
        // Update paling lama (paling bawah) tidak butuh garis vertikal lagi
        return isLast ? block : block + '\n│';
    }).join('\n');

    // Teks balasan ke pengguna (Disesuaikan dengan data yang tersedia di API J&T)
    let capt = `📦 *CEK RESI J&T EXPRESS*\n\n`
             + `*• No Resi:* ${res.resi}\n`
             + `*• Status:* ${res.current_status}\n`
             + `*• Lokasi Terakhir:* ${res.last_location}\n`
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

handler.help = ['jnt <resi> <4_digit>']
handler.tags = ['tools']
handler.command = /^(jnt|jntexpress|cekjnt)$/i
handler.limit = true
handler.register = true

module.exports = handler;