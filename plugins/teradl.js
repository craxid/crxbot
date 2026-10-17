const { Terabox } = require('../lib/resapi.js');
const mime = require('mime-types');

// Cookie sudah terisi otomatis dari data yang Anda berikan
const TERABOX_COOKIE = 'ndus=Yy5noCCteHuiK2GTMjOywlLTUzd0ym3ISpHNnIqV';

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `✳️ Contoh Penggunaan:\n*${usedPrefix + command}* https://terabox.com/sharing/link?surl=xxxx\n\nJika ada password, gunakan tanda | :\n*${usedPrefix + command}* link|password`;

  let [link, password] = args.join(' ').split('|').map(v => v.trim());
  if (!password && args[1] && !args[1].includes('http')) password = args[1];

  // Menyisipkan password ke dalam URL jika ada
  if (password && !link.includes('pwd=')) {
    link += (link.includes('?') ? '&' : '?') + 'pwd=' + password;
  }

  m.reply(global.wait || '⏳ Sedang mengekstrak data dari Terabox...');

  try {
    const tera = new Terabox();
    const files = await tera.extract(link);

    if (!files || files.length === 0) {
      throw new Error("Gagal mendapatkan link unduhan atau file berupa folder.");
    }

    // Eksekusi pengiriman untuk setiap file yang ditemukan di dalam link
    for (let file of files) {
      if (!file.dlink) {
        await m.reply(`⚠️ Gagal mendapatkan link untuk *${file.filename}*.`);
        continue;
      }

      const mimeType = mime.lookup(file.filename) || "application/octet-stream";
      const humanSize = formatSize(file.size);
      const caption = `✅ Done\n\n📂 Nama File: ${file.filename}\n📏 Size: ${humanSize}\n📑 MimeType: ${mimeType}`;

      if (mimeType.startsWith("video/")) {
        await conn.sendMessage(m.chat, {
          video: { url: file.dlink },
          mimetype: mimeType,
          caption: caption
        }, { quoted: m });
      } else if (mimeType.startsWith("image/")) {
        await conn.sendMessage(m.chat, {
          image: { url: file.dlink },
          mimetype: mimeType,
          caption: caption
        }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, {
          document: { url: file.dlink },
          fileName: file.filename,
          mimetype: mimeType,
          caption: caption
        }, { quoted: m });
      }
    }

  } catch (err) {
    console.error("DEBUG ERROR:", err);
    await m.reply(`❌ Terjadi kesalahan:\n${err.message}`);
  }
}

handler.help = ['terabox <link> [password]'];
handler.tags = ['downloader'];
handler.command = ['terabox', 'teradl', 'trdl', 'tbox'];
handler.premium = true;

module.exports = handler;