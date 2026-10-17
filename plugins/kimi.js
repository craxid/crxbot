const fs = require('fs');
const { chatWithKimi } = require('../lib/kimi.js'); // Pastikan path ini benar

const sesiFolder = 'sesi';
if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Halo! Ada yang bisa Kimi bantu?\n\nContoh: *.kimi carikan berita teknologi hari ini*");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const sesiFile = `${sesiFolder}/${who}-kimi.txt`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    // Load sesi Kimi (chatId) dari file Base64
    let chatId = null;
    if (fs.existsSync(sesiFile)) {
      try {
        const raw = fs.readFileSync(sesiFile, 'utf8');
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        const data = JSON.parse(decoded);
        chatId = data.chatId;
      } catch (e) {
        chatId = null; // Jika corrupt, buat sesi baru
      }
    }

    // Panggil fungsi Kimi dari lib/kimi.js
    const response = await chatWithKimi(text, chatId);

    // Simpan/Update chatId ke file sesi pengguna
    const sessionData = { chatId: response.chatId };
    const encoded = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64');
    fs.writeFileSync(sesiFile, encoded);

    // Kirim balasan ke user
    setTimeout(() => {
      m.reply(response.text);
    }, 1500);

  } catch (err) {
    console.error(err);
    m.reply(`❌ Kimi Error:\n\n${err.message}`);
  }
};

handler.command = handler.help = ['kimi'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;
handler.premium = false;

module.exports = handler;