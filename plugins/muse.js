const axios = require('axios');

// Jembatan ke Muse (agen pribadi owner): pertanyaan diteruskan ke antrean
// lokal di VPS ini, nanti Muse yang jawab dari tempatnya, bot tinggal
// meneruskan jawabannya ke chat asal. Makanya perintah ini tidak instan.
const QUEUE_URL = 'http://127.0.0.1:7521';

const antreanPending = new Map(); // senderId -> { id, chat, m, conn }
let pengecekJalan = false;

function mulaiPengecek() {
  if (pengecekJalan) return;
  pengecekJalan = true;
  setInterval(async () => {
    for (const [senderId, entri] of antreanPending) {
      try {
        const { data } = await axios.get(`${QUEUE_URL}/status/${entri.id}`, {
          headers: { 'x-token': global.museToken },
          timeout: 10000
        });
        if (data.state === 'done') {
          antreanPending.delete(senderId);
          await entri.conn.sendMessage(entri.chat, { text: data.answer }, { quoted: entri.m });
        } else if (data.state === 'expired') {
          antreanPending.delete(senderId);
          await entri.conn.sendMessage(entri.chat, { text: '⏳ Maaf, Muse belum sempat menjawab pertanyaanmu. Coba tanya lagi nanti ya.' }, { quoted: entri.m });
        }
      } catch (e) {
        // antrean lagi tidak bisa dihubungi, biarin aja, coba lagi nanti
      }
    }
  }, 10000);
}

const handler = async (m, { text, usedPrefix, command, conn }) => {
  if (!text) return m.reply(`Tanyakan sesuatu ke Muse.\n\nContoh: *${usedPrefix + command} apa itu lubang hitam?*\n\nJawabannya tidak instan ya, Muse menjawab dari tempatnya, biasanya sekitar 1-2 menit.`);

  const senderId = m.sender;
  if (antreanPending.has(senderId)) {
    return m.reply('⏳ Pertanyaanmu sebelumnya masih menunggu jawaban Muse. Sabar sebentar ya.');
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    const { data } = await axios.post(`${QUEUE_URL}/ask`, {
      chat: m.chat,
      senderName: m.pushName || senderId.split('@')[0],
      question: text
    }, {
      headers: { 'x-token': global.museToken },
      timeout: 10000
    });

    antreanPending.set(senderId, { id: data.id, chat: m.chat, m, conn });
    mulaiPengecek();

    return m.reply('📨 Pertanyaanmu sudah diteruskan ke Muse. Tunggu jawabannya di sini ya, biasanya 1-2 menit.');
  } catch (err) {
    console.error('Muse bridge error:', err.response?.data || err.message);
    return m.reply('❌ Jembatan ke Muse sedang tidak aktif. Coba lagi nanti.');
  }
};

handler.command = handler.help = ['muse'];
handler.tags = ['ai'];
handler.limit = true;
handler.register = true;

module.exports = handler;
