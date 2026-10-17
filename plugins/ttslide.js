const { douyin } = require('../lib/resapi'); 
const axios = require('axios');
const JSZip = require('jszip');

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    throw `Masukkan URL!\n\ncontoh:\n${usedPrefix + command} https://vt.tiktok.com/ZSLx6qhwM`;
  }
  
  // tiktok / douyin / short link resminya (tt.site dkk di-resolve otomatis di lib/douyin.js)
  // cek hostname beneran biar domain phising kayak tt.site.evil.com gak lolos
  let slideHost;
  try {
    slideHost = new URL(args[0]).hostname;
  } catch (e) {
    throw `URL Tidak Ditemukan!`;
  }
  if (!/(^|\.)tiktok\.com$|(^|\.)douyin\.com$|(^|\.)tt\.site$/i.test(slideHost)) {
    throw `URL Tidak Ditemukan!`;
  }
  
  // Menggunakan variabel wait dari config
  m.reply(wait);
  
  try {
    const res = await douyin(args[0]);
    
    if (!res) {
      throw `Gagal mengambil data dari URL tersebut.`;
    }

    if (res.isImageOnly && res.images.length > 0) {
      // 1. Inisialisasi JSZip untuk mengemas gambar
      const zip = new JSZip();
      
      for (let i = 0; i < res.images.length; i++) {
        try {
          const imageResponse = await axios.get(res.images[i], { responseType: 'arraybuffer' });
          zip.file(`slide_${i + 1}.jpg`, Buffer.from(imageResponse.data));
        } catch (downloadErr) {
          console.error(`Gagal mengunduh gambar ke-${i + 1}:`, downloadErr.message);
        }
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const caption = `*Deskripsi:* ${res.title || '-'}`;
      
      // Jeda 5 detik sebelum mengirim dokumen ZIP
      await sleep(5000);
      
      // Mengirim dokumen .zip dengan tag forwarded
      await conn.sendMessage(m.chat, { 
        document: zipBuffer, 
        mimetype: 'application/zip', 
        fileName: 'Tiktok_Slides.zip', 
        caption: caption,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true
        }
      }, { quoted: m });

      // Jika ada audionya, kirimkan terpisah dengan delay dan tag forwarded
      if (res.audioUrl) {
        // Jeda 5 detik sebelum mengirim audio
        await sleep(5000); 
        
        // Mengirim audio dengan tag forwarded
        await conn.sendFile(m.chat, res.audioUrl, 'audio.mp3', '', m, false, {
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true
          }
        });
      }

    } else if (res.videoUrl) {
      // 2. Fallback jika link ternyata video biasa dengan tag forwarded
      let caption = `*Deskripsi:* ${res.title || '-'}\n*Durasi:* ${res.duration || '-'}`;
      
      // Jeda 5 detik sebelum mengirim video
      await sleep(5000);
      
      // Mengirim video dengan tag forwarded
      await conn.sendFile(m.chat, res.videoUrl, 'video.mp4', caption, m, false, {
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true
        }
      });
    } else {
      throw `Media tidak ditemukan atau format tidak didukung.`;
    }

  } catch (e) {
    console.error(e);
    throw `🚩 *Terjadi kesalahan!*\n${e.message || e}`;
  }
};

handler.command = handler.help = ['tiktokslide', 'ttslide', 'slide'];
handler.tags = ['downloader'];
handler.limit = true;
handler.group = false;
handler.premium = false;
handler.owner = false;
handler.admin = false;
handler.botAdmin = false;
handler.fail = null;
handler.private = false;

module.exports = handler;

// Fungsi delay dikembalikan untuk menjeda pengiriman
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}