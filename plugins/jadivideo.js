const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// API Key Agnes AI
const AGNES_KEY = 'ISI_API_KEY_DISINI'; 
const TMP = './tmp';

// Fungsi Upload Mandiri (Bypass file lib eksternal untuk mencegah error)
async function uploadInline(buffer) {
  try {
    // Coba unggah ke Uguu terlebih dahulu (seperti hasil .tourl di bot Anda)
    const form = new FormData();
    form.append('files[]', buffer, 'image.jpg');
    const res = await axios.post('https://uguu.se/upload', form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (res.data && res.data.files && res.data.files.length > 0) {
      return res.data.files[0].url;
    }
  } catch (e) {
    console.log("[Inline Upload] Uguu gagal:", e.message);
  }

  try {
    // Fallback ke Catbox jika Uguu sedang sibuk
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, 'image.jpg');
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });
    if (res.data) return res.data;
  } catch (e) {
    console.log("[Inline Upload] Catbox gagal:", e.message);
  }
  
  return null;
}

async function sendAny(conn, chatId, filePath, buffer, quoted, caption) {
  try { return await conn.sendFile(chatId, filePath, 'video.mp4', caption, quoted); } catch {}
  try { return await conn.sendMessage(chatId, { video: buffer || fs.readFileSync(filePath), caption }, { quoted }); } catch {}
  throw new Error('Gagal mengirim file video. Cek implementasi conn.');
}

var handler = async (m, { conn, text }) => {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  if (!/image/.test(mime)) throw 'Balas gambar yang ingin dijadikan video!';

  // prompt: prioritas = teks command > caption quoted > default
  const defaultPrompt = 'Gerakkan kamera perlahan, sinematik, natural';
  let prompt = (text || '').trim();
  if (!prompt) {
    const quotedCaption = (q.msg && q.msg.caption) ? q.msg.caption : '';
    prompt = quotedCaption.replace(/^\s*!vidimg\s*/i, '').trim() || defaultPrompt;
  }

  try {
    await m.reply(global.wait || 'Sedang memproses video dengan Agnes AI... (bisa memakan waktu beberapa menit)');

    // 1. Download input image
    const media = await q.download();
    const inputPath = path.join(TMP, `${Date.now()}-in.png`);
    fs.writeFileSync(inputPath, media);

    // 2. Upload menggunakan fungsi inline yang dijamin jalan
    const imageUrl = await uploadInline(media);
    if (!imageUrl || typeof imageUrl !== 'string') throw new Error('Gagal mengunggah gambar ke server publik (Uguu/Catbox).');

    // 3. Panggil Agnes API
    const queueRes = await fetch('https://apihub.agnes-ai.com/v1/videos', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${AGNES_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'agnes-video-v2.0',
        prompt: prompt,
        image: imageUrl,
        num_frames: 121,
        frame_rate: 24
      })
    });

    const queueJson = await queueRes.json();
    
    if (queueRes.status !== 200 || !queueJson.video_id) {
       console.error("Agnes API Error:", queueJson);
       throw new Error(queueJson.error?.message || 'Tidak ada video_id dari API Agnes.');
    }

    const videoId = queueJson.video_id;

    // 4. Polling retrieve sampai selesai
    let videoUrl = null;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const retrieveRes = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${videoId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${AGNES_KEY}` }
      });
      const retrieveJson = await retrieveRes.json();
      console.log(`[Agnes AI] Task Status: ${retrieveJson.status} | Progress: ${retrieveJson.progress}%`);

      if (retrieveJson.status === 'completed') {
        videoUrl = retrieveJson.metadata?.url;
        break;
      }
      if (retrieveJson.status === 'failed') {
        throw new Error('Agnes AI gagal memproses video.');
      }
    }

    if (!videoUrl) throw new Error('Waktu tunggu habis. Video belum selesai diproses.');

    // 5. Unduh video hasil
    const r = await fetch(videoUrl);
    if (!r.ok) throw new Error('Gagal mengunduh video hasil dari Agnes AI.');
    const outBuffer = await r.buffer();
    const outPath = path.join(TMP, `agnes-${Date.now()}.mp4`);
    fs.writeFileSync(outPath, outBuffer);

    // 6. Kirim hasil
    await sendAny(conn, m.chat, outPath, outBuffer, m, `*AGNES AI VIDEO*\n\nPrompt: ${prompt}\n${global.wm || ''}`);

    // 7. Bersihkan file
    try { fs.unlinkSync(inputPath); } catch {}
    try { if (outPath) fs.unlinkSync(outPath); } catch {}

  } catch (e) {
    console.error(e);
    m.reply(`Gagal membuat video:\n\n${e.message || e}`);
  }
};

handler.command = handler.help = ['jadivideo','aivideo','img2vid'];
handler.tags = ['tools'];
handler.limit = 5;
handler.register = true;
handler.premium = false;

module.exports = handler;