const { chatAI } = require('../lib/9router'); // Sesuaikan path ini dengan struktur folder Anda

// Model Gemini 3.8 yang aktif di Antigravity, dirolling:
// kalau model pertama gagal, lanjut ke model berikutnya sampai ada yang jawab
const MODELS = [
  "ag/gemini-3.8-flash-medium",
  "ag/gemini-3.8-flash-low",
  "ag/gemini-3.8-flash"
];

const handler = async (m, { text, conn }) => {
  if (!text) return m.reply('Ada yang bisa saya bantu?');

  try {
    const who = m.sender.split('@')[0];
    const senderName = m.pushName || "User";

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }});

    // Rolling: coba model satu per satu
    let hasil = null;
    let errorTerakhir = null;
    for (const model of MODELS) {
      try {
        hasil = await chatAI({
          senderId: who,
          senderName: senderName,
          text: text,
          model: model,
          aiName: "a helpful assistant",
          sesiPrefix: "gemini"
        });
        break; // berhasil, stop rolling
      } catch (err) {
        errorTerakhir = err;
        console.log(`[bard] model ${model} gagal, rolling ke berikutnya:`, err.message);
      }
    }
    if (!hasil) throw errorTerakhir;

    conn.sendPresenceUpdate('composing', m.chat);
    setTimeout(() => {
      m.reply(hasil);
    }, 1500);

  } catch (err) {
    console.error('AI Handler Error:', err.response?.data || err.message);
    m.reply(`❌ Error: ${err.response?.data?.error?.message || err.message}`);
  }
};

handler.command = handler.help = ['gemini','bard'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;
