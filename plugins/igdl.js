const axios = require("axios");

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `✳️ Contoh:\n *${usedPrefix + command}* https://www.instagram.com/reel/Cf1HZNvvGuM/`;
  
  // Pastikan global.wait sudah didefinisikan di bot Anda, atau ganti dengan teks manual
  m.reply(global.wait || '⏳ Sedang memproses...');

  try {
    if (!/instagram/gi.test(args[0])) throw `❌ Itu bukan link Instagram yang valid.`;

    const url = `https://api.siputzx.my.id/api/d/sssinstagram?url=${encodeURIComponent(args[0])}`;
    const response = await axios.get(url);
    const res = response.data;

    // Cek apakah data tersedia dan status bernilai true
    if (!res || !res.status || !res.data) {
      throw new Error(`⚠️ Gagal mendapatkan respons dari server atau link tidak valid.`);
    }

    const meta = res.data.meta || {};
    const mediaArray = res.data.url || [];

    // Susun caption dari metadata yang tersedia di Siputzx API
    let textCaption = `*I N S T A G R A M   D O W N L O A D E R*\n\n`;
    textCaption += `👤 *Username:* ${meta.username || "-"}\n`;
    textCaption += `🔖 *Shortcode:* ${meta.shortcode || "-"}\n`;
    textCaption += `🔗 *Source:* ${meta.source || args[0]}\n`;
    textCaption += `📝 *Caption:*\n${meta.title ? meta.title : "Tidak ada caption"}\n\n`;
    textCaption += `${global.wm || "Bot WhatsApp"}`;

    // Cek apakah ada URL media yang valid (mencegah error jika API mengembalikan null)
    const validMedia = mediaArray.filter(media => media.url !== null);
    if (validMedia.length === 0) {
      throw new Error("⚠️ Media tidak ditemukan. API mengembalikan nilai kosong (null). Mungkin akun privat atau error dari server API.");
    }

    // Looping untuk mengirim file (mendukung postingan slide/banyak foto)
    for (let i = 0; i < validMedia.length; i++) {
      let media = validMedia[i];
      // Ambil ekstensi dari JSON baru (ext) atau fallback ke mp4/jpg
      let ext = media.ext || (media.type === 'image' ? 'jpg' : 'mp4');
      
      // Kirim caption hanya pada media pertama agar bot tidak spam teks
      let sendCaption = (i === 0) ? textCaption : "";
      
      await conn.sendFile(m.chat, media.url, `igdl.${ext}`, sendCaption, m);
    }

  } catch (err) {
    console.error(err);
    throw `❌ Terjadi kesalahan saat mengambil data.\n\n${err.message || err}`;
  }
};

handler.help = ['instagram <link ig>'];
handler.tags = ['downloader'];
handler.command = ['ig', 'igdl', 'instagram', 'igvid'];
handler.limit = true;
handler.register = true;

module.exports = handler;
