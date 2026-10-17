let fs = require("fs")

let handler = async (m, { conn}) => {
    // Path gambar QRIS
    let gmbr = './media/qris.jpg'

    // Nomor owner dari global config
    let owner = global.numberowner

    // Teks dengan mention ke pengirim
    let tegs = `Hai kak @${m.sender.split('@')[0]} 👋

Terima kasih sudah tertarik dengan bot ini! Kalau kamu ingin *mendukung* atau *menyewa* bot, berikut info lengkapnya:

💰 *Sewa Bot*
Harga: *Rp25.000* untuk 30 hari penuh akses

📲 *Donasi & Pembayaran*
Kamu bisa kirim melalui QRIS di atas
Untuk pembayaran internasional, tersedia juga via PayPal: https://paypal.me/dedeklender

📩 Setelah transfer, kirim bukti pembayaran ke admin @${global.numberowner} ya!

Dukungan kamu sangat berarti dan membantu bot ini terus aktif dan berkembang. Terima kasih banyak! 🙏`

    // Baca gambar dari file
    let buffer = fs.readFileSync(gmbr)

    // Kirim pesan dengan gambar dan mention
    await conn.sendMessage(m.chat, {
        image: buffer,
        caption: tegs,
        contextInfo: {
            expiration: 864000,
            mentionedJid: [m.sender]
}
}, { quoted: m})
}

handler.help = handler.command = ['donasi','donate','sewa','sewabot','belibot']
handler.tags = ['main']
module.exports = handler