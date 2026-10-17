const { douyin } = require('../lib/resapi');

let handler = async (m, { conn, args, usedPrefix, command}) => {
  if (!args[0]) throw `✳️ Contoh:\n *${usedPrefix + command}* https://vt.tiktok.com/xxxxxx`
  
  let parsedUrl;
  try {
    // Validasi ketat: Memastikan input adalah URL yang sah
    parsedUrl = new URL(args[0]);
    
    // Pastikan menggunakan protokol HTTP/HTTPS (mencegah link aneh)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error();
    }
  } catch (e) {
    throw `❌ Harap masukkan format URL yang valid (diawali http:// atau https://)!`;
  }

  // Mengecek apakah domain/hostname asli berasal dari TikTok, Douyin,
  // atau short link resminya (tt.site dkk di-resolve otomatis di lib/douyin.js)
  // regex di-anchor biar domain phising kayak tt.site.evil.com gak lolos
  if (!/(^|\.)tiktok\.com$|(^|\.)douyin\.com$|(^|\.)tt\.site$/i.test(parsedUrl.hostname)) {
    throw `❌ Itu bukan link TikTok kocak`;
  }
  
  m.reply(wait);

  try {
    // Menggunakan args[0] (URL asli yang terbukti valid) ke fungsi scraper
    const result = await douyin(args[0]);

    if (!result) throw `Gagal mengambil data dari URL tersebut.`;

    const caption = `*TikTok Downloader*\n\n` +
      `🎬 *Judul:* ${result.title || '-'}\n` +
      `⏱️ *Durasi:* ${result.duration || '-'}\n` +
      `${global.wm}`;

    // Logika Opsi 2: Tolak slide dan arahkan ke .ttslide
    if (result.isImageOnly) {
      throw `❌ Link yang kamu masukkan adalah postingan slide foto.\n\nSilakan gunakan perintah *${usedPrefix}ttslide* untuk mengunduh postingan berupa foto/slide.`;
    } else if (result.videoUrl) {
      // Jika video biasa, kirimkan videonya
      await conn.sendFile(m.chat, result.videoUrl, 'tiktok.mp4', caption, m);
    } else {
      throw `❌ Media tidak didukung atau tidak ditemukan.`;
    }
  } catch (err) {
    console.error(err);
    throw typeof err === 'string' ? err : `❌ Terjadi kesalahan saat mengambil konten.\n\n${err.message || err}`;
  }
};

handler.help = ['tiktok <link>'];
handler.tags = ['downloader'];
handler.command = ['tiktok','tt','ttdl','tiktokdl'];
handler.limit = true;
handler.register = true;
handler.group = false;
module.exports = handler;