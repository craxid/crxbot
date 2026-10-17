const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "kc/deepseek/deepseek-chat",
      aiName: "",
      sesiPrefix: "deepseek"
    });

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 2000);
    
  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Error:\n\n${errorMsg}`);
  }
};

handler.command = handler.help = ['deepseek', 'dsai'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;
handler.premium = false;

module.exports = handler;