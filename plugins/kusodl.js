const axios = require('axios');
const cheerio = require('cheerio'); // Kita tambahkan cheerio di sini
const { searchAnime, scrapePostDetails } = require('../lib/kuso.js');

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`❌ Masukkan judul anime atau link!\n\n*Contoh Pencarian:*\n${usedPrefix + command} saijaku tamer\n\n*Contoh Link:*\n${usedPrefix + command} https://kusonime.com/saijakutamer-batch-subtitle-indonesia/`);
  }

  const waitMsg = typeof wait !== 'undefined' ? wait : '⏳ Sedang memproses...';
  await m.reply(waitMsg);

  try {
    const isUrl = /^https?:\/\//i.test(text) && /kusonime\.com/i.test(text);

    if (isUrl) {
      // ==========================================
      //        MODE 1: DOWNLOAD / DETAIL
      // ==========================================
      const detail = await scrapePostDetails(text);
      
      if (!detail) {
          return m.reply("❌ Gagal mengambil data. Pastikan link yang dikirim valid atau web Kusonime sedang tidak down.");
      }

      // Rapikan Info Anime
      let infoText = '';
      if (detail.info && Object.keys(detail.info).length > 0) {
          for (const [key, value] of Object.entries(detail.info)) {
              infoText += `*${key}:* ${value}\n`;
          }
      }

      // Rapikan Link Download
      let downloadLinks = '';
      if (detail.downloads && detail.downloads.length > 0) {
          detail.downloads.forEach(dl => {
              downloadLinks += `\n*${dl.quality}*\n`;
              for (const [host, url] of Object.entries(dl.links)) {
                  downloadLinks += `*~> ${host}:* ${url}\n`;
              }
          });
      }

      if (!downloadLinks.trim()) {
          downloadLinks = '\n❌ Link download tidak ditemukan. (Mungkin tidak tersedia batch).';
      }

      // ==========================================
      // PERBAIKAN: MENGAMBIL THUMBNAIL
      // ==========================================
      let img = '';
      try {
          const { data } = await axios.get(text);
          const $ = cheerio.load(data);
          
          // Cari gambar dari berbagai selektor yang sering dipakai Kusonime
          img = $('.post-thumb img').attr('src') || 
                $('meta[property="og:image"]').attr('content') || 
                $('.lexot img').first().attr('src') || 
                '';
          
          // Jika url gambar tidak pakai https: (misal //domain.com/img.jpg)
          if (img && img.startsWith('//')) {
              img = 'https:' + img;
          }
      } catch (e) {
          console.error('Gagal mengambil thumbnail:', e.message);
      }

      // Susun caption
      let caption = `*🎥 ${detail.title}*\n\n`;
      if (infoText) caption += `*📑 Info Anime:*\n${infoText}\n`;
      caption += `*📝 Sinopsis:*\n${detail.synopsis}\n\n`;
      caption += `*📥 Link Download:*${downloadLinks}`;
      
      return await safeSendMedia(m, conn, img, caption);

    } else {
      // ==========================================
      //          MODE 2: SEARCH ENGINE
      // ==========================================
      const results = await searchAnime(text);

      if (!results || results.length === 0) return m.reply(`❌ Tidak ditemukan hasil untuk kata kunci: *${text}*`);

      const slicedResults = results.slice(0, 20);

      let txt = `🔍 *Hasil Pencarian: ${text}*\n\n`;
      slicedResults.forEach((r, i) => {
         txt += `*${i + 1}. ${r.title}*\n🔗 ${r.url}\n\n`;
      });
      txt += `*Ketik:* ${usedPrefix + command} <link_diatas> untuk menampilkan daftar download.`;
      
      return m.reply(txt);
    }

  } catch (err) {
    console.error('Error Handler:', err);
    m.reply(`*[ DEBUG ERROR ]*\n\n${err.message}`);
  }
};

// Fungsi helper
async function safeSendMedia(m, conn, img, txt) {
  try {
    if (!img) throw new Error('No image found'); 
    return await conn.sendMessage(m.chat, { 
        image: { url: img }, 
        caption: txt 
    }, { quoted: m });
  } catch (e) {
    console.error('Gagal kirim gambar:', e.message);
    return m.reply(txt); // Fallback kirim teks kalau gambar gagal
  }
}

handler.command = ['kusonime', 'kusodl', 'kusosearch'];
handler.help = ['kusonime <query / link>'];
handler.tags = ['downloader'];
handler.register = true;
handler.limit = true;
module.exports = handler;
