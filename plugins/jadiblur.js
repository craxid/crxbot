const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const uploadImage = require('../lib/uploadImage'); // sudah kamu kirim
const VENICE_KEY = global.venice;

async function sendFlexible(conn, chatId, outPath, outBuffer, quoted, caption) {
  // Coba kirim sebagai file path
  try {
    await conn.sendFile(chatId, outPath, 'edited.png', caption, quoted);
    return 'sendFile(path)';
  } catch (e) {
    console.log('sendFile(path) failed:', e && e.message);
  }

  // Coba kirim sebagai buffer payload
  try {
    await conn.sendMessage(chatId, { image: outBuffer || fs.readFileSync(outPath), caption }, { quoted });
    return 'sendMessage(buffer)';
  } catch (e) {
    console.log('sendMessage(buffer) failed:', e && e.message);
  }

  throw new Error('Semua metode pengiriman gagal. Cek implementasi conn.');
}

var handler = async (m, { conn }) => {
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  if (!/image/.test(mime)) throw 'Balas gambar yang ingin diblur!';

  try {
    await m.reply(global.wait || 'Tunggu sebentar...');

    // simpan input sementara
    const media = await q.download();
    const inputPath = path.join(tmpDir, `${Date.now()}-in.png`);
    fs.writeFileSync(inputPath, media);

    // upload ke storage publik
    const imageUrl = await uploadImage(media); // uploadImage menerima buffer
    console.log('uploadImage returned:', typeof imageUrl, imageUrl && imageUrl.slice ? imageUrl.slice(0,200) : imageUrl);
    if (!imageUrl || typeof imageUrl !== 'string') throw new Error('uploadImage harus mengembalikan URL publik.');

    // panggil Venice
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VENICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: 'jadikan gambar ini blur', image: imageUrl })
    };

    const apiRes = await fetch('https://api.venice.ai/api/v1/image/edit', options);

    // Jika mengembalikan binary image langsung, content-type akan image/*
    const contentType = apiRes.headers.get('content-type') || '';
    let outBuffer = null;
    let outPath = null;

    if (contentType.startsWith('image/')) {
      // langsung binary image
      outBuffer = await apiRes.buffer();
      const ext = contentType.split('/')[1] ? `.${contentType.split('/')[1].split(';')[0]}` : '.png';
      outPath = path.join(tmpDir, `jadiblur-${Date.now()}${ext}`);
      fs.writeFileSync(outPath, outBuffer);
      console.log('Venice returned image binary, saved to', outPath);
    } else {
      // baca sebagai teks untuk deteksi URL/base64/JSON
      const raw = await apiRes.text();
      if (!raw) throw new Error('API mengembalikan respons kosong.');
      console.log('VENICE RAW PREVIEW:', raw.slice(0, 1000));

      // coba parse JSON jika mungkin
      let candidate = raw.trim().replace(/^"|"$/g, '');
      try {
        const parsed = JSON.parse(raw);
        // jika parsed adalah string, gunakan itu
        if (typeof parsed === 'string') candidate = parsed.trim().replace(/^"|"$/g, '');
        // jika parsed adalah object, cari field yang mungkin berisi hasil
        else if (parsed && typeof parsed === 'object') {
          candidate = parsed.result || parsed.url || parsed.image || parsed.data || candidate;
        }
      } catch (e) {
        // bukan JSON, lanjut dengan candidate yang sudah dibersihkan
      }

      // sekarang candidate harus berisi URL atau base64
      if (!candidate) throw new Error('Tidak menemukan hasil gambar di respons.');

      // jika candidate adalah URL -> unduh
      if (/^https?:\/\//i.test(candidate)) {
        const r = await fetch(candidate);
        if (!r.ok) throw new Error(`Gagal mengunduh hasil dari URL: ${r.status}`);
        outBuffer = await r.buffer();
        const ext = path.extname(new URL(candidate).pathname) || '.png';
        outPath = path.join(tmpDir, `jadiblur-${Date.now()}${ext}`);
        fs.writeFileSync(outPath, outBuffer);
        console.log('Downloaded result URL to', outPath);
      } else if (/^data:image\/[a-zA-Z]+;base64,/.test(candidate)) {
        // data URI
        const b64 = candidate.split(',')[1];
        outBuffer = Buffer.from(b64, 'base64');
        outPath = path.join(tmpDir, `jadiblur-${Date.now()}.png`);
        fs.writeFileSync(outPath, outBuffer);
        console.log('Decoded data URI to', outPath);
      } else if (/^[A-Za-z0-9+/=\s]+$/.test(candidate) && candidate.length > 100) {
        // plain base64
        outBuffer = Buffer.from(candidate.replace(/\s+/g, ''), 'base64');
        outPath = path.join(tmpDir, `venice-${Date.now()}.png`);
        fs.writeFileSync(outPath, outBuffer);
        console.log('Decoded plain base64 to', outPath);
      } else {
        throw new Error('Format respons tidak dikenali (bukan URL/base64).');
      }
    }

    if (!outPath && !outBuffer) throw new Error('Gagal memproses respons.');

    // PENTING: selalu kirim file path atau buffer, jangan kirim string mentah
    const method = await sendFlexible(conn, m.chat, outPath, outBuffer, m, global.wm || '');
    console.log('Send method used:', method);

    // bersihkan file sementara
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { if (outPath) fs.unlinkSync(outPath); } catch (e) {}

  } catch (error) {
    console.error('Handler error:', error);
    const msg = error && error.message ? error.message : String(error);
    throw `Terjadi kesalahan saat mengedit gambar:\n\n${msg}`;
  }
};

handler.command = handler.help = ['jadiblur','blurface', 'blurwajah'];
handler.tags = ['tools'];
handler.limit = 3;
handler.register = true;
handler.premium = false;

module.exports = handler;