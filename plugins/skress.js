let { stress } = require('caliph-api');

let handler = async (m, { conn, command, text, usedPrefix}) => {
  if (!text) throw `Masukkan nama, contoh: ${usedPrefix + command} <nama karakter atau mention>`;

  // Ambil mention jika ada
  let mentioned = m.mentionedJid && m.mentionedJid[0];
  let targetName = mentioned? await conn.getName(mentioned): text;

  // Pastikan fungsi tersedia
  if (typeof stress[command]!== 'function') {
    throw `Perintah *${command}* tidak dikenali.`;
}

  try {
    let hasil = await stress[command](text);

    // Ganti semua @lid atau @⁨+nomor⁩ dengan nama pengguna
    let cleanText = hasil.replace(/@[^ ]+/g, `@${targetName}`);

    // Balasan ke pengirim
    let senderName = await conn.getName(m.sender);
    m.reply(`*${cleanText}`);
} catch (err) {
    console.error(err);
    throw `Ups, terjadi kesalahan:\n\n${err.message || err}`;
}
};

handler.command = /^(wangy|wangy2|nenen|simp|sherk)$/i;
module.exports = handler;