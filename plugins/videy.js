const cloudscraper = require('cloudscraper');

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0];
  //const waitMsg = '⏳ Sedang memproses...';

  if (!url || !/^https?:\/\/(www\.)?videy\.co\/\S+/.test(url)) {
    return m.reply(`❌ Format salah.\nGunakan perintah:\n*${usedPrefix + command} <link videy.co>*`);
  }

  m.reply(wait);

  try {
    // Ambil video id dari query id=...
    const match = url.match(/id=([A-Za-z0-9]+)/);
    if (!match) return m.reply('❌ Tidak menemukan ID video pada URL.');

    const videoId = match[1];
    const videoUrl = `https://cdn.videy.co/${videoId}.mp4`;

    // Unduh sebagai Buffer lewat cloudscraper
    // encoding: null -> hasil berupa Buffer
    const buffer = await cloudscraper.get({ uri: videoUrl, encoding: null });

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return m.reply('❌ Gagal mengunduh video atau file kosong.');
    }

    // Jika file sangat besar, pertimbangkan untuk menulis ke file sementara
    // dan mengirim sebagai stream. Di sini contoh langsung mengirim buffer.
    await conn.sendMessage(m.chat, {
      video: buffer,
      mimetype: 'video/mp4',
      fileName: `${videoId}.mp4`,
      caption: `Videy Downloader\n${global.wm || ''}`
    }, { quoted: m });

  } catch (err) {
    console.error('Download error:', err);
    // Jangan kirim stack trace ke user; kirim pesan umum
    m.reply('❌ Terjadi kesalahan saat mengambil video. Coba lagi nanti.');
  }
};

handler.command = ['videy'];
handler.help = ['videy <link videy.co>'];
handler.tags = ['downloader'];
handler.limit = true;
handler.premium = true;
handler.register = true

module.exports = handler;