const fetch = require('node-fetch');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let handler = async (m, { conn, text }) => {
  if (!text) throw 'Cari apa?';

  // Daftar apikey yang diberikan
  const apiKeys = ["Trial-BmijiUPygRD8XIwk", "bell409"];
  const baseUrl = "https://api.termai.cc/api/search/google-image";
  
  let success = false;
  let json;

  try {
    // Loop untuk mencoba setiap apikey jika terjadi limit/error
    for (let key of apiKeys) {
      try {
        let res = await fetch(`${baseUrl}?query=${encodeURIComponent(text)}&key=${key}`);
        json = await res.json();
        if (json.status && json.data?.length > 0) {
          success = true;
          break; 
        }
      } catch (e) {
        continue;
      }
    }

    if (!success || !json?.data) throw 'Gagal mengambil data dari API atau hasil tidak ditemukan.';

    let results = json.data;
    let url = results[Math.floor(Math.random() * results.length)];

    // Download gambar ke Buffer
    let imgRes = await fetch(url);
    if (!imgRes.ok) throw 'Gagal mendownload gambar dari sumber asli.';
    let buffer = await imgRes.buffer();

    // Deteksi apakah buffer adalah format WebP berdasarkan "Magic Bytes"
    const isWebp = buffer.length > 12 && 
                   buffer.slice(0, 4).toString() === 'RIFF' && 
                   buffer.slice(8, 12).toString() === 'WEBP';

    if (isWebp) {
        // Buat nama file temporary yang unik di direktori tmp bawaan OS
        const randomId = Math.random().toString(36).substring(2, 8);
        const tmpFileIn = path.join(os.tmpdir(), `imgIn_${randomId}.webp`);
        const tmpFileOut = path.join(os.tmpdir(), `imgOut_${randomId}.jpg`);
        
        // Tulis buffer webp ke file temporary
        fs.writeFileSync(tmpFileIn, buffer);
        
        // Eksekusi FFMPEG untuk konversi dari WebP ke JPG
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i ${tmpFileIn} ${tmpFileOut}`, (err) => {
                if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn); // Hapus temp in
                
                if (err) return reject('Gagal mengkonversi gambar WebP ke JPG.');
                resolve();
            });
        });
        
        // Timpa buffer dengan hasil gambar berformat JPG
        buffer = fs.readFileSync(tmpFileOut);
        
        // Bersihkan sisa file temporary
        if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut); 
    }

    await conn.sendFile(m.chat, buffer, 'google.jpg', `
*── 「 GOOGLE IMAGE 」 ──*

Result: *${text}*
`.trim(), m);

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `*── 「 ERROR LOG 」 ──*\n\n${String(e)}`, m);
  }
};

handler.help = ['gimage <search>'];
handler.tags = ['internet'];
handler.command = /^(gimage|image)$/i;
handler.limit = true;
handler.register = true;

module.exports = handler;