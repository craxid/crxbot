const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Ketik pertanyaanmu untuk Qwen!\n\nContoh: *.qwen buktikan bahwa bumi itu bulat*");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "bzl/qwen3.6-plus",
      aiName: "Qwen",
      sesiPrefix: "qwen"
    });

    setTimeout(() => {
      m.reply(hasil);
    }, 1500);

  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Qwen Error:\n\n${errorMsg}`);
  }
};

handler.command = handler.help = ['qwen', 'ai'];
handler.tags = ['ai'];
handler.limit = 1;
handler.register = true;
handler.premium = false;

module.exports = handler;
