const { chatAI } = require('../lib/9router.js');

const handler = async (m, { text, usedPrefix, command, conn }) => {
  if (!text) throw `Masukkan pertanyaan!\n\n*Contoh:* ${usedPrefix + command} Siapa presiden Indonesia? `;

  try {
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const nama = `@${m.sender.split('@')[0]}`;

    await conn.sendPresenceUpdate('composing', m.chat);
    await m.reply(wait);

    const hasil = await chatAI({
      senderId: who,
      senderName: nama,
      text: text,
      model: "oc/big-pickle",
      aiName: "Meta AI",
      sesiPrefix: "metaai"
    });

    setTimeout(() => {
      conn.sendPresenceUpdate('composing', m.chat);
      m.reply(hasil);
    }, 2000);

  } catch (err) {
    console.error(err);
    throw (`Error: Tidak dapat menjawab pertanyaan!`);
  }
};

handler.command = handler.help = ['metaai'];
handler.tags = ['tools'];
handler.premium = false;
handler.limit = 1;
handler.restrict = true;

module.exports = handler;
