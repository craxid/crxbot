const { douyin } = require('../lib/resapi');

let handler = async (m, { conn, args, usedPrefix, command}) => {
  if (!args[0]) throw `✳️ Contoh:\n *${usedPrefix + command}* https://v.douyin.com/0bPUHvviqss/`;
  m.reply(wait);

  try {
    const result = await douyin(args[0]);

    const caption = `*Douyin Downloader*\n\n` +
      `🎬 *Judul:* ${result.title}\n` +
      `⏱️ *Durasi:* ${result.duration}\n` +
      `${global.wm}`;

    if (result.isImageOnly) {
      await conn.sendFile(m.chat, result.thumbnail, 'douyin.jpg', caption, m);
    } else {
      await conn.sendFile(m.chat, result.videoUrl, 'douyin.mp4', caption, m);
    }
  } catch (err) {
    console.error(err);
    throw `❌ Terjadi kesalahan saat mengambil konten.\n\n${err}`;
  }
};

handler.help = ['douyin <link>'];
handler.tags = ['downloader'];
handler.command = ['douyin', 'dy', 'douyindl'];
handler.limit = true;

module.exports = handler;
