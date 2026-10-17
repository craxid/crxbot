const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Gunakan process.env untuk menyimpan API_KEY demi keamanan
const API_KEY = 'ISI_API_KEY_DISINI'; 

/**
 * Fungsi untuk mengirim media dengan metode yang fleksibel
 */
async function sendFlexible(conn, chatId, outPath, outBuffer, quoted, caption) {
  try {
    await conn.sendFile(chatId, outPath, 'edited.png', caption, quoted);
    return 'sendFile(path)';
  } catch (e) {
    console.log('sendFile(path) failed:', e?.message);
  }

  try {
    const bufferToSend = outBuffer || fs.readFileSync(outPath);
    await conn.sendMessage(chatId, { image: bufferToSend, caption }, { quoted });
    return 'sendMessage(buffer)';
  } catch (e) {
    console.log('sendMessage(buffer) failed:', e?.message);
  }

  throw new Error('Semua metode pengiriman gagal. Cek implementasi conn.');
}

let handler = async (m, { conn }) => {
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  if (!/image/.test(mime)) throw 'Balas gambar yang ingin dihitamkan!';

  // --- LOGIKA KALKULASI UKURAN DINAMIS ---
  let originalWidth = q.width || (q.msg && q.msg.width) || 1024;
  let originalHeight = q.height || (q.msg && q.msg.height) || 1024;

  let maxSize = 1024;
  let w = originalWidth;
  let h = originalHeight;

  if (w > h) {
      h = Math.round((h / w) * maxSize);
      w = maxSize;
  } else {
      w = Math.round((w / h) * maxSize);
      h = maxSize;
  }

  w = Math.round(w / 64) * 64 || 64;
  h = Math.round(h / 64) * 64 || 64;

  let dynamicSize = `${w}x${h}`;
  // --------------------------------------

  let outPath;

  try {
    await m.reply(global.wait || '⏳ Tunggu sebentar, sedang memproses gambar dengan Agnes 2.0...');

    // 1. Download gambar dari pesan pengguna (berupa Buffer)
    const media = await q.download();

    // 2. Konversi buffer ke Data URI Base64
    const base64Image = media.toString('base64');
    const dataUri = `data:${mime || 'image/png'};base64,${base64Image}`;

    // 3. Siapkan payload JSON untuk Agnes AI 2.0 Flash
    const payload = {
      model: "agnes-image-2.0-flash", // Menggunakan model 2.0
      prompt: "Make the person's skin color dark or black while preserving the original composition, background, and layout", 
      size: dynamicSize, // <--- Memasukkan ukuran dinamis
      extra_body: {
        image: [dataUri],
        response_format: "b64_json"
      }
    };

    // 4. Panggil API Agnes
    const apiRes = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${API_KEY}`, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await apiRes.json();

    if (!apiRes.ok) {
      throw new Error(json.error?.message || JSON.stringify(json));
    }

    // 5. Ekstrak hasil Base64
    const b64Data = json.data?.[0]?.b64_json;
    if (!b64Data) {
      throw new Error('Gagal menemukan hasil gambar pada respons API.');
    }

    // 6. Simpan buffer hasil ke file sementara
    const outBuffer = Buffer.from(b64Data, 'base64');
    outPath = path.join(tmpDir, `hitamkan-${Date.now()}-out.png`);
    fs.writeFileSync(outPath, outBuffer);

    // 7. Kirim hasil kembali ke pengguna dengan info resolusi
    await sendFlexible(conn, m.chat, outPath, outBuffer, m, `Sukses memproses gambar 🖤\n📐 Size: ${dynamicSize}\n\n${global.wm || '© CraXID Bot'}`);

  } catch (error) {
    console.error('Handler error:', error);
    const msg = error?.message ? error.message : String(error);
    throw `❌ Terjadi kesalahan saat memproses gambar:\n\n${msg}`;
  } finally {
    // 8. Bersihkan file sementara
    try {
      if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch (err) {
      console.error('Gagal menghapus file output:', err);
    }
  }
};

handler.help = ['hitamkan', 'hytamkan'];
handler.tags = ['tools'];
handler.command = /^(hitamkan|hytamkan)$/i;
handler.limit = 5;
handler.register = true;
handler.premium = false;

module.exports = handler;