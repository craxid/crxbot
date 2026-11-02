const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detail, downloadVideo } = require('../lib/neko');

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
      //   MODE 1: KIRIM VIDEO DARI LINK EPISODE
      // ==========================================
      const res = await detail(text.trim());
      if (!res.status) return m.reply(`❌ Gagal mengambil data dari link itu.\n${res.error || ''}`);
      const { title, thumbnail, synopsis, streams, downloads } = res.result;

      // urutan coba: streampoi/streamruby dulu karena server itu yg bisa diambil videonya,
      // playmogo/dood belakangan (biasanya mental di cloudflare, tapi tetep dicoba)
      const urutan = [...(streams || [])].sort((a, b) => {
        const skor = s => /streampoi|streamruby/i.test(s.provider) ? 0 : 1;
        return skor(a) - skor(b);
      });

      let terkirim = false;
      let alasanGagal = '';
      for (const s of urutan) {
        const tmp = path.join(os.tmpdir(), `neko-${Date.now()}-${Math.floor(Math.random() * 9999)}.mp4`);
        try {
          await m.reply(`📥 Mengunduh video dari server ${s.provider}, mohon tunggu...`);
          const out = await downloadVideo(s.url, tmp, { maxBytes: 100 * 1024 * 1024 });
          const menit = out.duration ? `${Math.floor(out.duration / 60)} menit` : '';
          const caption = `*🎥 ${title}*\n\n` +
            (synopsis ? synopsis.slice(0, 300).trim() + '\n\n' : '') +
            `📺 Server: ${s.provider}${out.resolution ? ` (${out.resolution})` : ''}${menit ? `\n⏱️ Durasi: ${menit}` : ''}\n💾 Ukuran: ${(out.size / 1048576).toFixed(1)} MB`;
          await conn.sendFile(m.chat, out.path, `${title}.mp4`, caption, m);
          terkirim = true;
          break;
        } catch (e) {
          alasanGagal = e.message;
        } finally {
          try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
        }
      }
      if (terkirim) return;

      // semua server streaming gagal diambil -> balik ke perilaku lama: sampul + link
      let downloadLinks = '';
      (downloads || []).forEach(row => {
        downloadLinks += `\n*${row.resolution}*\n`;
        row.links.forEach(l => { if (l.url) downloadLinks += `~> ${l.provider}: ${l.url}\n`; });
      });
      let streamLinks = '';
      (streams || []).forEach(s => { streamLinks += `~> ${s.provider}: ${s.url}\n`; });

      let caption = `*🎥 ${title}*\n\n${(synopsis || '').trim()}\n`;
      if (alasanGagal) caption += `\n⚠️ Video tidak bisa dikirim langsung: ${alasanGagal}\n`;
      if (streamLinks) caption += `\n*📺 Link Streaming:*\n${streamLinks}`;
      if (downloadLinks) caption += `\n*📥 Link Download:*${downloadLinks}`;
      return await safeSendMedia(m, conn, thumbnail, caption);

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
                  const mm = /nekopoi\.care\/([^/]+)\/?$/.exec(link);
                  if (!mm) return;
                  const slug = mm[1].toLowerCase();
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
      txt += `*Ketik:* ${usedPrefix + command} <link_diatas> untuk menonton, bot akan mengirimkan file videonya langsung.`;

      return m.reply(txt);
    }

  } catch (err) {
    console.error('Error Handler:', err);
    m.reply(`❌ Terjadi kesalahan: ${err.message}`);
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
