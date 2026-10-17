const axios = require('axios');
const cheerio = require('cheerio');

// Fungsi khusus untuk mengambil "Result Asli" dari DOM MediaFire
async function mediafireScraper(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        
        const $ = cheerio.load(data);
        const link = $('#downloadButton').attr('href');
        
        if (!link) return { status: false };

        // Parsing metadata murni dari elemen MediaFire
        const filename = $('.dl-info .info .filename').text().trim() || $('.dl-btn-label').attr('title');
        
        // Mengambil dari list detail informasi
        const details = $('ul.details li');
        const filesize = details.eq(0).text().replace('File size:', '').trim();
        const uploaded = details.eq(1).text().replace('Uploaded:', '').trim();

        const ext = filename.split('.').pop().toLowerCase();

        return {
            status: true,
            filename: filename,
            filesize: filesize,
            uploaded: uploaded,
            extension: ext,
            link: link
        };
    } catch (error) {
        console.error('Scraper Error:', error);
        return { status: false, msg: error.message };
    }
}

const handler = async (m, { text, usedPrefix, command, conn }) => {
  if (!text) {
    throw `Masukkan link MediaFire!\n\n*Contoh:* ${usedPrefix + command} https://www.mediafire.com/file/gq0ov94gqq8myl0`;
  }
  
  if (!/mediafire\.com/i.test(text)) {
    throw '❌ URL tidak valid! Pastikan itu adalah link MediaFire.';
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    m.reply(wait);

    // Memanggil fungsi scraper untuk mendapatkan result asli
    const result = await mediafireScraper(text);

    if (!result.status) {
      throw 'Gagal mengambil data! File mungkin sudah dihapus, dipassword, atau IP terblokir.';
    }

    // Kamus Mimetype (tetap dipertahankan agar tidak menjadi .BIN / .PDF di WA)
    const mimeMap = {
        'apk': 'application/vnd.android.package-archive',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    };

    let tipe = mimeMap[result.extension] || 'application/octet-stream';

    // Caption menggunakan data real dari MediaFire
    const caption = `
📄 *Nama:* ${result.filename}
📦 *Ukuran:* ${result.filesize}
📅 *Diunggah:* ${result.uploaded}
🗂️ *Ekstensi:* ${result.extension.toUpperCase()}

*_Sedang mengirim file..._*
    `.trim();

    await conn.sendPresenceUpdate('recording', m.chat);
    await m.reply(caption);

    // Kirim dokumen
    await conn.sendMessage(m.chat, {
      document: { url: result.link },
      fileName: result.filename,
      mimetype: tipe,
    }, { quoted: m });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (err) {
    console.error(err);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    throw `❌ Terjadi kesalahan:\n${err.message || err}`;
  }
};

handler.command = ['mediafire', 'mf'];
handler.help = ['mediafire <url>'];
handler.tags = ['downloader'];
handler.premium = false;
handler.limit = 1;
handler.register = true;

module.exports = handler;
