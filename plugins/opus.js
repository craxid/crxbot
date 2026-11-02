const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Opus siap membantu. Apa yang ingin kamu tanyakan?\n\nContoh: *.opus jelaskan teori relativitas*");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "bzl/claude-opus-4.7",
      aiName: "Claude Opus",
      sesiPrefix: "opus"
    });

    m.reply(hasil);
  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Opus Error:\n\n${errorMsg}`);
  }
};

handler.command = handler.help = ['opus'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;
