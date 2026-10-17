const { chatAI } = require('../lib/9router'); // Sesuaikan path ini dengan struktur folder Anda

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Ada yang bisa saya bantu?');
  
  try {
    const who = m.sender.split('@')[0];
    const senderName = m.pushName || "User";

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

    // Memanggil library chatAI
    const hasil = await chatAI({
        senderId: who,
        senderName: senderName,
        text: text,
        model: "gh/gpt-5.3-codex",
        aiName: "a helpful assistant",
        sesiPrefix: "codex"
    });

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 1500);
    
  } catch (err) {
    console.error('AI Handler Error:', err.response?.data || err.message);
    m.reply(`❌ Error: ${err.response?.data?.error?.message || err.message}`);
  }
};

handler.command = handler.help = ['claude','codex'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;