// File: plugins/opus.js
const { chatWithNotionAI } = require('../lib/notionai.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Opus 5 siap membantu. Apa yang ingin kamu tanyakan?\n\nContoh: *.opus jelaskan teori relativitas*");

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    // Memanggil API dengan model Opus 5
    const result = await chatWithNotionAI(text, 'notionai/Opus 5');

    m.reply(result);
  } catch (err) {
    m.reply(`❌ Opus Error:\n\n${err.message}`);
  }
};

handler.command = handler.help = ['opus'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;