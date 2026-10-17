const fetch = require('node-fetch');

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `Contoh penggunaan:\n*${usedPrefix}${command}* https://www.facebook.com/share/r/1BXuqTET2G/`;

  try {
    await m.reply(global.wait || 'Sedang memproses...');

    if (!/facebook\.com|fb\.watch|fb\.gg|m\.facebook\.com/i.test(args[0])) {
      throw `Itu bukan link Facebook yang valid.`;
    }

    const apiUrl = `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(args[0])}`;
    const apiResponse = await fetch(apiUrl);
    const apiJson = await apiResponse.json();

    if (!apiJson.status || !apiJson.data || !apiJson.data.downloads) {
      throw `Gagal mengunduh video: respons API tidak valid atau link privat.`;
    }

    const videoData = apiJson.data;
    const title = videoData.title || 'Facebook Video';
    const duration = videoData.duration || '-';

    // ambil kualitas tertinggi (HD dulu)
    let downloads = videoData.downloads.filter(v => v.type === 'video' && v.url);
    if (!downloads.length) throw `Tidak ditemukan link download video.`;

    // urutkan: HD/720p dulu
    downloads.sort((a, b) => {
      const qa = /hd|720/i.test(a.quality) ? 0 : 1;
      const qb = /hd|720/i.test(b.quality) ? 0 : 1;
      return qa - qb;
    });

    let downloadUrl = downloads[0].url;
    let quality = downloads[0].quality || '-';

    const caption = `*F A C E B O O K   D O W N L O A D E R*\n\n` +
                    `Judul: ${title}\n` +
                    `Durasi: ${duration}\n` +
                    `Kualitas: ${quality}\n\n` +
                    `${global.wm || 'Bot WhatsApp'}`;

    await conn.sendFile(m.chat, downloadUrl, 'fb_video.mp4', caption, m);

  } catch (err) {
    console.error(err);
    throw `Ups, ada yang eror:\n${err?.message || String(err)}`;
  }
};

handler.help = ['facebook'].map(v => v + ' <url>');
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
handler.tags = ['downloader'];
handler.limit = true;
handler.register = true;

module.exports = handler;
