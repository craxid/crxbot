const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Ada yang bisa saya bantu?");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "cbai/glm-4.7",
      aiName: "CF AI",
      sesiPrefix: "cfai"
    });

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 800);

  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Error terjadi:\n\n${errorMsg}`);
  }
};

handler.command = handler.help = ['cfai', 'cloudflareai'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;
