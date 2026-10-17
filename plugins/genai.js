const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Pastikan folder sesi ada
const sesiFolder = 'sesi';
if (!fs.existsSync(sesiFolder)) {
  fs.mkdirSync(sesiFolder);
}

const MAX_HISTORY_LENGTH = 5;

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mimetype || '';
  const isMedia = /^image\/(?!webp)|^video\//.test(mime);

  if (!isMedia) throw `Kirim atau balas gambar/video dengan caption ${usedPrefix + command}`;
  if (!global.goapi) throw 'API key Google Generative AI belum dikonfigurasi.';

  try {
    // Menyesuaikan variabel wait jika belum terdefinisi secara global
    const processingMsg = typeof wait !== 'undefined' ? wait : '⏳ Memproses media...';
    const processing = await conn.reply(m.chat, processingMsg, m);

    const genAI = new GoogleGenerativeAI(global.goapi);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-3.5-flash' });

    const media = await q.download();
    if (!Buffer.isBuffer(media)) throw 'Gagal mengunduh media sebagai buffer.';

    const prompt = text || 'Deskripsikan isi media ini';

    // Identifikasi ID pengguna untuk mencocokkan file sesi dengan command bard/gemini
    const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
    const sesiFile = `${sesiFolder}/${who}-gemini.txt`;

    // Load riwayat percakapan dari Base64
    let riwayatPercakapan = [];
    if (fs.existsSync(sesiFile)) {
      const raw = fs.readFileSync(sesiFile, 'utf8');
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      riwayatPercakapan = JSON.parse(decoded);
    }

    // Tambahkan pesan pengguna baru beserta data medianya ke dalam riwayat
    riwayatPercakapan.push({
      role: "user",
      parts: [
        {
          inlineData: {
            data: media.toString("base64"),
            mimeType: mime,
          }
        },
        { text: prompt }
      ]
    });

    // Batasi riwayat percakapan agar tidak melampaui batas token
    if (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
      while (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
        riwayatPercakapan.shift(); 
        riwayatPercakapan.shift(); 
      }
    }

    await conn.sendPresenceUpdate('recording', m.chat);

    // Kirim request ke model dengan membawa seluruh konteks riwayat percakapan
    const result = await model.generateContent({
      contents: riwayatPercakapan
    });

    const responseText = result.response.text();

    // Tambahkan respons dari model ke riwayat percakapan untuk sesi berikutnya
    riwayatPercakapan.push({ role: "model", parts: [{ text: responseText }] });

    // Lakukan pembatasan riwayat kembali setelah respons masuk
    if (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
      while (riwayatPercakapan.length > MAX_HISTORY_LENGTH * 2) {
        riwayatPercakapan.shift(); 
        riwayatPercakapan.shift(); 
      }
    }

    // Simpan kembali riwayat sebagai Base64
    const encoded = Buffer.from(JSON.stringify(riwayatPercakapan, null, 2)).toString('base64');
    fs.writeFileSync(sesiFile, encoded);

    await conn.sendPresenceUpdate('paused', m.chat);

    await conn.sendMessage(m.chat, {
      text: responseText,
      edit: processing.key
    });

  } catch (error) {
    console.error("Error processing media:", error);
    throw `Maaf, terjadi kesalahan saat memproses media.\n\n${error}`;
  }
}

handler.command = handler.help = ['genai'];
handler.tags = ['tools'];
handler.limit = 1;
handler.register = true;
handler.premium = false;
module.exports = handler;