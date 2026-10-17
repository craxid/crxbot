const { scrapePixeldrain } = require('../lib/pixeldrain');

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `✳️ Contoh:\n*${usedPrefix + command}* https://pixeldrain.com/u/aycSARAA`;

  if (!args[0].match(/pixeldrain\.com/i)) {
    throw `❌ Itu bukan link Pixeldrain yang valid.\nContoh: https://pixeldrain.com/u/aycSARAA`;
  }

  let users = global.db.data.users[m.sender];
  let umur = users.age;

  if (umur < 18) {
    await m.reply(`❎ Kamu masih dibawah umur, minimal 18 tahun untuk menggunakan fitur ini`);
    return;
  }
  if (umur > 60) {
    await m.reply(`❎ Umur kamu terlalu tua, maksimal 60 tahun untuk menggunakan fitur ini`);
    return;
  }

  m.reply(global.wait || '⏳ Sedang mengambil data...');

  try {
    const { fileId, fileName, mimeType, directLink } = await scrapePixeldrain(args[0]);

    if (mimeType && mimeType.startsWith("video/")) {
      await conn.sendMessage(m.chat, {
        video: { url: directLink },
        mimetype: mimeType,
        caption: `✅ Video dari Pixeldrain\n${fileName || fileId}`
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, {
        document: { url: directLink },
        fileName: fileName || fileId,
        mimetype: mimeType || "application/octet-stream",
        caption: `✅ File dari Pixeldrain\n${fileName || fileId}`
      }, { quoted: m });
    }

  } catch (err) {
    console.error("DEBUG ERROR:", err);
    console.error("DEBUG STACK:", err.stack);
    await m.reply(`❌ Terjadi kesalahan saat mengambil data:\n${err.message}\n\nStack:\n${err.stack}`);
  }
};

handler.help = ['pixeldrain <link>'];
handler.tags = ['downloader'];
handler.command = ['pixeldrain', 'pd', 'pixeldl'];
handler.register = true;
handler.premium = true;

module.exports = handler;