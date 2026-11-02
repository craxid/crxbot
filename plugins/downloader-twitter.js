const axios = require("axios");

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `Masukan URL Twitter/X!\n\ncontoh:\n${usedPrefix + command} https://twitter.com/gofoodindonesia/status/1229369819511709697`;

  // validasi linknya twitter/x beneran
  const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i;
  if (!twitterRegex.test(args[0])) {
    throw `URL tidak valid! Hanya mendukung link dari Twitter/X (twitter.com atau x.com)`;
  }

  m.reply(wait);

  try {
    // pake siputzx, sama kayak igdl/fbdl
    const apiUrl = `https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(args[0])}`;
    const { data: res } = await axios.get(apiUrl);
    if (!res || !res.status || !res.data) throw new Error('API tidak mengembalikan data');

    const { downloadLink, videoTitle, videoDescription } = res.data;
    if (!downloadLink) throw new Error('Video tidak ditemukan di tweet itu');

    let caption = `*Twitter Downloader*\n\n*Creator*: ${videoTitle || '-'}\n*Judul*: ${videoDescription || '-'}`;
    await conn.sendFile(m.chat, downloadLink, 'twitter.mp4', caption, m);
  } catch (e) {
    console.error(e);
    throw `*Gagal mengunduh video Twitter/X!*\n${e.message || ''}`.trim();
  }
};

handler.command = handler.help = ['twitter', 'twitdl', 'twitterdl', 'xdl'];
handler.tags = ['downloader'];
handler.limit = true;

module.exports = handler;
