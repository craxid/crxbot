const axios = require('axios');
const cheerio = require('cheerio');

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`❌ Masukkan judul anime atau link!\n\n*Contoh Pencarian:*\n${usedPrefix + command} overflow\n\n*Contoh Link:*\n${usedPrefix + command} https://nekopoi.care/uncensored-overflow-episode-1-subtitle-indonesia/`);
  }

  const waitMsg = typeof wait !== 'undefined' ? wait : '⏳ Sedang memproses...';
  await m.reply(waitMsg);

  const axiosConfig = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
    timeout: 15000 
  };

  try {
    const isUrl = /^https?:\/\//i.test(text) && /nekopoi/i.test(text);

    if (isUrl) {
      // ==========================================
      //        MODE 1: DOWNLOAD / DETAIL
      // ==========================================
      const { data } = await axios.get(text, axiosConfig);
      const $ = cheerio.load(data);
      
      let title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
      title = title.replace(/\s*[\u2013\u2014-]\s*NekoPoi\s*$/i, '').trim(); /* entity HTML udah di-decode cheerio, jangan match '&#8211;' mentah */

      if (title.toLowerCase().includes('just a moment')) {
          return m.reply("❌ Server NekoPoi sedang dilindungi Cloudflare, coba lagi nanti.");
      }

      let img = $('.nk-featured-img img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
      
      let description = '';
      $('.konten p').each((i, el) => {
          const txt = $(el).text().trim();
          if (txt) description += txt + '\n';
      });
      
      if (!description.trim()) {
          description = $('meta[name="description"]').attr('content') || 'Tidak ada deskripsi yang tersedia.';
      }

      let downloadLinks = '';
      $('.nk-download-row').each((i, el) => {
        const resolution = $(el).find('.nk-download-name').text().trim();
        if (resolution) {
            downloadLinks += `\n*${resolution}*\n`;
            $(el).find('.nk-download-links a').each((j, a) => {
                const provider = $(a).text().trim();
                const href = $(a).attr('href');
                if (href) downloadLinks += `~> ${provider}: ${href}\n`;
            });
        }
      });

      if (!downloadLinks.trim()) {
          return m.reply("❌ Gagal menemukan link download. Pastikan link yang dikirim adalah halaman per episode.");
      }

      let caption = `*🎥 ${title}*\n\n${description.trim()}\n\n*📥 Link Download:*${downloadLinks}`;
      return await safeSendMedia(m, conn, img, caption);

    } else {
      // ==========================================
      //          MODE 2: SEARCH ENGINE
      // ==========================================
      // NekoPoi kadang mem-bypass redirect search ke parameter default WordPress
      const searchUrl = `https://nekopoi.care/?s=${encodeURIComponent(text)}`;
      const { data } = await axios.get(searchUrl, axiosConfig);
      const $ = cheerio.load(data);

      // Cek apakah mode search terkena block Cloudflare
      const pageTitle = $('title').text().trim().toLowerCase();
      if (pageTitle.includes('just a moment') || pageTitle.includes('attention required')) {
          return m.reply("❌ Pencarian diblokir oleh sistem Anti-Bot (Cloudflare). Silakan coba lagi nanti.");
      }

      let results = [];
      
      // Daftar class DOM yang sering dipakai NekoPoi dari masa ke masa
      const selectors = [
          '.nk-post-card h2 a', 
          '.eropost h2 a', 
          '.animepost h2 a', 
          '.result-item h2 a',
          '.posts h2 a',
          'article h2 a'
      ];
      
      // Loop selector yang paling cocok
      for (const selector of selectors) {
          $(selector).each((i, el) => {
              const title = $(el).text().trim() || $(el).attr('title');
              const link = $(el).attr('href');
              
              if (title && link && !results.some(r => r.link === link)) {
                  results.push({ title, link });
              }
          });
          if (results.length > 0) break; // Berhenti looping jika dapet data
      }

      // ==========================================
      // FALLBACK BRUTAL (Scraping Paksa)
      // ==========================================
      // Jika semua class di atas tidak ada, ambil SEMUA tag <a> yang formatnya seperti link postingan
      if (results.length === 0) {
          $('a').each((i, el) => {
              const title = $(el).text().trim();
              const link = $(el).attr('href');

              if (title && link && link.includes('nekopoi.care') && title.length > 5) {
                  // ambil slug terakhir dari URL
                  const m = /nekopoi\.care\/([^/]+)\/?$/.exec(link);
                  if (!m) return;
                  const slug = m[1].toLowerCase();
                  // BUKAN postingan: halaman genre, jadwal, info, dsb (dulu lolos karena blacklist kurang lengkap)
                  const isBlacklisted = /^(genre|genres|category|categories|tag|tags|page|author|search|jadwal|schedule|dmca|privacy|contact|about|faq|disclaimer|tos|terms|sitemap|login|register)$/i.test(slug);
                  // postingan anime biasanya ada kata "episode" atau akhiran "subtitle-indonesia"
                  const looksLikePost = /episode|subtitle-indonesia/i.test(slug);

                  if (!isBlacklisted && looksLikePost && !results.some(r => r.link === link)) {
                      results.push({ title, link });
                  }
              }
          });
      }

      // Potong hasil jadi 10 aja biar chat WA ga kepanjangan
      results = results.slice(0, 10);

      if (results.length === 0) return m.reply(`❌ Tidak ditemukan hasil untuk kata kunci: *${text}*`);

      let txt = `🔍 *Hasil Pencarian: ${text}*\n\n`;
      results.forEach((r, i) => {
         txt += `*${i + 1}. ${r.title}*\n🔗 ${r.link}\n\n`;
      });
      txt += `*Ketik:* ${usedPrefix + command} <link_diatas> untuk menampilkan daftar download.`;
      
      return m.reply(txt);
    }

  } catch (err) {
    console.error('Error Handler:', err);
    m.reply(`*[ DEBUG ERROR ]*\n\n${err.message}`);
  }
};

async function safeSendMedia(m, conn, img, txt) {
  try {
    if (!img) throw new Error('No image found'); 
    return await conn.sendMessage(m.chat, { 
        image: { url: img }, 
        caption: txt 
    }, { quoted: m });
  } catch (e) {
    return m.reply(txt);
  }
}

handler.command = ['nekopoi', 'nekodl', 'nekosearch'];
handler.help = ['nekopoi <query / link>'];
handler.tags = ['nsfw','downloader'];
handler.register = true;
handler.premium = true;

module.exports = handler;