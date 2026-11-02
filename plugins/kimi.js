const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Halo! Ada yang bisa Kimi bantu?\n\nContoh: *.kimi carikan berita teknologi hari ini*");

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    conn.sendPresenceUpdate('composing', m.chat);

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "clinepass/cline-pass/kimi-k2.6",
      aiName: "Kimi",
      sesiPrefix: "kimi"
    });

    setTimeout(() => {
      m.reply(hasil);
    }, 1500);

  } catch (err) {
    console.error(err);
    const errorMsg = err?.response?.data?.error?.message || err.message;
    m.reply(`❌ Kimi Error:\n\n${errorMsg}`);
  }
};

handler.command = handler.help = ['kimi'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;
handler.premium = false;

module.exports = handler;
