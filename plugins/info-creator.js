const {
  default: makeWASocket,
  BufferJSON,
  WA_DEFAULT_EPHEMERAL,
  generateWAMessageFromContent,
  downloadContentFromMessage,
  downloadHistory,
  proto,
  getMessage,
  generateWAMessageContent,
  prepareWAMessageMedia
} = require("@adiwajshing/baileys");

const handler = async (m, { conn}) => {
  const name = global.nameowner || 'Owner Bot';
  const number = global.numberowner;
  const email = global.mail || 'owner@example.com';

  // Validasi data penting
  if (!name ||!number) {
    return conn.reply(m.chat, "Maaf, data owner belum lengkap.");
}

  const vcard = `BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:${name}
item.ORG:Owner Bot
item1.TEL;waid=${number}:${number}@s.whatsapp.net
item1.X-ABLabel:Nomor Owner Bot
item2.ADR:;;Indonesia;;;;
item2.X-ABADR:ac
item3.EMAIL;type=INTERNET:${email}
item3.X-ABLabel:Email Developer
item4.URL:https://crax.my.id
item4.X-ABLabel:Website
item5.URL:https://crax.us.kg
item5.X-ABLabel:Website
item6.URL:https://facebook.com/dede2015k
item6.X-ABLabel:Facebook
END:VCARD`;

  const sentMsg = await conn.sendMessage(
    m.chat,
    {
      contacts: {
        displayName: 'Owner Bot',
        contacts: [{ vcard}]
}
}
);

  await conn.reply(m.chat, `✅ Berikut adalah kontak owner bot:\n📛 Nama: ${name}\n📱 Nomor: ${number}`, sentMsg);
};

handler.command = handler.help = ['owner', 'creator'];
handler.tags = ['info'];
handler.limit = true;

module.exports = handler;