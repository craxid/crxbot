const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const uploadImage = require('../lib/uploadImage'); // Pastikan path ini sesuai dengan struktur bot kamu

const VENICE_KEY = global.venice;
const TMP = './tmp';

async function sendAny(conn, chatId, filePath, buffer, quoted, caption) {
  try { return await conn.sendFile(chatId, filePath, 'anime-style.png', caption, quoted); } catch {}
  try { return await conn.sendMessage(chatId, { image: buffer || fs.readFileSync(filePath), caption }, { quoted }); } catch {}
  throw new Error('Gagal mengirim file. Cek implementasi conn.');
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  
  if (!/image/.test(mime)) throw `Balas gambar yang ingin diubah menjadi anime dengan command ${usedPrefix + command}`;
    // Base prompt yang diperketat untuk mempertahankan detail asli foto
  const baseAnimePrompt = 'Masterpiece, best quality, ultra-detailed 2D anime illustration. STRICTLY PRESERVE exact same composition, keep original pose, preserve original clothing details, preserve identical background, maintain original facial structure and lighting. Do not change the core subject, only apply a vibrant anime aesthetic art style adaptation, studio ghibli vibe';

  
  // Jika user memasukkan teks tambahan, gabungkan dengan base prompt
  const prompt = text ? `${baseAnimePrompt}, ${text}` : baseAnimePrompt;

  try {
    await m.reply(wait);

    // Download gambar asli
    const media = await q.download();
    const inputPath = path.join(TMP, `${Date.now()}-in.png`);
    fs.writeFileSync(inputPath, media);

    // Upload ke storage publik agar bisa dibaca oleh Venice API
    const imageUrl = await uploadImage(media);
    if (!imageUrl || typeof imageUrl !== 'string') throw new Error('uploadImage gagal mengembalikan URL publik.');

    // Hit Venice API
    const res = await fetch('https://api.venice.ai/api/v1/image/edit', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${VENICE_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ prompt: prompt, image: imageUrl })
    });

    const ct = res.headers.get('content-type') || '';
    let outBuffer = null;
    let outPath = null;

    // Proses respons API berdasarkan Content-Type
    if (ct.startsWith('image/')) {
      outBuffer = await res.buffer();
      const ext = ct.split('/')[1]?.split(';')[0] || 'png';
      outPath = path.join(TMP, `venice-${Date.now()}.${ext}`);
      fs.writeFileSync(outPath, outBuffer);
    } else {
      let raw = (await res.text()).trim().replace(/^"|"$/g, '');
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') raw = parsed;
        else if (parsed && typeof parsed === 'object') raw = parsed.result || parsed.url || parsed.image || parsed.data || raw;
      } catch {}
      
      if (/^https?:\/\//i.test(raw)) {
        const r = await fetch(raw);
        if (!r.ok) throw new Error('Gagal mengunduh hasil dari URL.');
        outBuffer = await r.buffer();
        outPath = path.join(TMP, `venice-${Date.now()}${path.extname(new URL(raw).pathname) || '.png'}`);
        fs.writeFileSync(outPath, outBuffer);
      } else if (/^data:image\/[a-zA-Z]+;base64,/.test(raw)) {
        outBuffer = Buffer.from(raw.split(',')[1], 'base64');
        outPath = path.join(TMP, `venice-${Date.now()}.png`);
        fs.writeFileSync(outPath, outBuffer);
      } else if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) {
        outBuffer = Buffer.from(raw.replace(/\s+/g, ''), 'base64');
        outPath = path.join(TMP, `venice-${Date.now()}.png`);
        fs.writeFileSync(outPath, outBuffer);
      } else {
        throw new Error('Format respons Venice AI tidak dikenali.');
      }
    }

    // Format caption tanpa emoji
    const caption = `*${global.htki || '≡'} JADI ANIME ${global.htka || '≡'}*\n\nPrompt Tambahan: ${text || '-'}\n\n${global.wm || ''}`;
    
    await sendAny(conn, m.chat, outPath, outBuffer, m, caption.trim());

    // Bersihkan file temporary
    try { fs.unlinkSync(inputPath); } catch {}
    try { if (outPath) fs.unlinkSync(outPath); } catch {}

  } catch (e) {
    console.error(e);
    throw `Gagal memproses gambar:\n${e.message || e}`;
  }
};

handler.command = handler.help = ['toanime', 'jadianime', 'animefilter'];
handler.tags = ['tools'];
handler.limit = true; // Set true untuk menghemat resource Venice API
handler.register = true;
handler.premium = false;

module.exports = handler;