const uploadImage = require('../lib/uploadImage'); // pastikan path sesuai
const fetch = require('node-fetch');

let handler = async (m, { conn }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    if (!mime) throw 'Kirim/Reply Gambar dengan caption .removebg';
    m.reply(wait);

    // Download gambar dari pesan
    let media = await q.download();
    
    // Upload gambar ke hosting sementara (telegraph/pomf/dll) untuk mendapatkan URL
    let url = await uploadImage(media);
    if (!url) throw 'Gagal mengunggah gambar. Coba lagi nanti.';

    // URL API yang baru dengan parameter gambar yang diunggah
    // Menggunakan encodeURIComponent agar URL aman saat digabungkan
    let apiUrl = `https://api.azbry.com/api/tools/removebg?url=${encodeURIComponent(url)}`;

    // Panggil API
    let res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);

    // Ambil hasil sebagai buffer gambar
    let buffer = await res.buffer();

    // Kirim gambar ke pengguna
    await conn.sendPresenceUpdate('composing', m.chat);
    await conn.sendFile(m.chat, buffer, 'img.png', 'Background Remover\n© CraXID Bot', m);
  } catch (e) {
    console.error(e);
    m.reply(`Ada yang error nih\n\n${e}`);
  }
};

handler.help = ['removebg'];
handler.tags = ['tools'];
handler.command = /^(removebg|nobg)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;