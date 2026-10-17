const fs = require('fs');
// Pastikan path ini mengarah ke file qwen.js yang baru kamu buat
const { chatWithQwen } = require('../lib/qwen.js'); 

const sesiFolder = 'sesi';
if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Ketik pertanyaanmu untuk Qwen!\n\nContoh: *.qwen buktikan bahwa bumi itu bulat*");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const sesiFile = `${sesiFolder}/${who}-qwen.txt`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    // Load sesi Qwen (hanya perlu chatId) dari file Base64
    let chatId = null;
    if (fs.existsSync(sesiFile)) {
      try {
        const raw = fs.readFileSync(sesiFile, 'utf8');
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        const data = JSON.parse(decoded);
        chatId = data.chatId;
      } catch (e) {
        // Jika file corrupt/error, biarkan chatId null agar Qwen membuat sesi baru
        chatId = null; 
      }
    }

    // Panggil Qwen API
    const response = await chatWithQwen(text, chatId);

    // Simpan atau update chatId ke file sesi dengan Base64
    const sessionData = { chatId: response.chatId };
    const encoded = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64');
    fs.writeFileSync(sesiFile, encoded);

    // Kirim balasan ke user
    setTimeout(() => {
      m.reply(response.text);
    }, 1500);

  } catch (err) {
    console.error(err);
    m.reply(`❌ Qwen Error:\n\n${err.message}`);
  }
};

handler.command = handler.help = ['qwen', 'ai'];
handler.tags = ['ai'];
handler.limit = 1;
handler.register = true;
handler.premium = false;

module.exports = handler;