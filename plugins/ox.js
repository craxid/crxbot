const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Ada yang bisa saya bantu?');

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "oc/big-pickle",
      aiName: "OpenCode AI",
      sesiPrefix: "ox"
    });

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 1500);

  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Error: ${errorMsg}`);
  }
};

handler.command = handler.help = ['ox', 'oxalpha'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;
