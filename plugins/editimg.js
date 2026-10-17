const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Gunakan process.env untuk menyimpan API_KEY demi keamanan
const API_KEY = 'ISI_API_KEY_DISINI'; 
const TMP = './tmp';

async function sendAny(conn, chatId, filePath, buffer, quoted, caption) {
  try { 
    return await conn.sendFile(chatId, filePath, 'edited.png', caption, quoted); 
  } catch (e) {
    // Fallback jika sendFile gagal
  }
  try { 
    return await conn.sendMessage(chatId, { image: buffer || fs.readFileSync(filePath), caption }, { quoted }); 
  } catch (e) {
    // Fallback jika sendMessage gagal
  }
  throw new Error('Gagal mengirim file. Cek implementasi conn.');
}

let handler = async (m, { conn, text }) => {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
  
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  if (!/image/.test(mime)) throw 'Balas gambar yang ingin diedit!';

  // --- LOGIKA KALKULASI UKURAN DINAMIS ---
  // 1. Ambil resolusi asli dari metadata pesan WhatsApp
  let originalWidth = q.width || (q.msg && q.msg.width) || 1024;
  let originalHeight = q.height || (q.msg && q.msg.height) || 1024;

  // 2. Kalkulasi rasio aspek (maksimal sisi terpanjang 1024)
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

  // 3. Bulatkan ke kelipatan 64
  w = Math.round(w / 64) * 64 || 64;
  h = Math.round(h / 64) * 64 || 64;

  let dynamicSize = `${w}x${h}`;
  // --------------------------------------

  const defaultPrompt = 'ubah gambar ini';
  let prompt = (text || '').trim();
  if (!prompt) {
    const quotedCaption = (q.msg && q.msg.caption) ? q.msg.caption : '';
    // Membersihkan prefix command dari caption jika ada
    prompt = quotedCaption.replace(/^\s*!(editimg|edit|aiedit)\s*/i, '').trim() || defaultPrompt;
  }

  let outPath = null;

  try {
    await m.reply(global.wait || '⏳ Sedang memproses editan dengan Agnes 2.0 Flash...');

    // 1. Download gambar dari pesan pengguna (berupa Buffer)
    const media = await q.download();

    // 2. Konversi buffer ke Data URI Base64
    const base64Image = media.toString('base64');
    const dataUri = `data:${mime || 'image/png'};base64,${base64Image}`;

    // 3. Siapkan payload JSON untuk Agnes AI 2.0 Flash
    const payload = {
      model: "agnes-image-2.0-flash", // Menggunakan model 2.0
      prompt: prompt,
      size: dynamicSize, // <--- Memasukkan ukuran dinamis ke payload
      extra_body: {
        image: [dataUri],
        response_format: "b64_json"
      }
    };

    // 4. Panggil API Agnes AI
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
    outPath = path.join(TMP, `edit-${Date.now()}.png`);
    fs.writeFileSync(outPath, outBuffer);

    // 7. Kirim hasil ke user (Menambahkan informasi ukuran di caption)
    await sendAny(conn, m.chat, outPath, outBuffer, m, `Prompt: ${prompt}\n📐 Size: ${dynamicSize}\n\n${global.wm || '© CraXID Bot'}`);

  } catch (error) {
    console.error('Handler error:', error);
    const msg = error?.message ? error.message : String(error);
    throw `❌ Gagal mengedit gambar:\n\n${msg}`;
  } finally {
    // 8. Bersihkan file sementara (Cleanup)
    try { 
      if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath); 
    } catch (err) { 
      console.error('Gagal menghapus file output:', err); 
    }
  }
};

handler.command = handler.help = ['editimg','edit','aiedit'];
handler.tags = ['tools'];
handler.limit = 5;
handler.register = true;
handler.premium = false;

module.exports = handler;