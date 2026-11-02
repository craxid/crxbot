const { terabox2 } = require('../lib/resapi.js');

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `Contoh:\n*${usedPrefix + command}* https://terabox.com/sharing/link?surl=xxxx\n\nJika ada password: *${usedPrefix + command}* link|password`;

  let [link, password] = args.join(' ').split('|').map(v => v.trim());
  if (!/terabox|1024tera|4funbox|mirrobox/i.test(link)) throw 'Link bukan Terabox!';

  m.reply(wait);

  try {
    const files = await terabox2(link, password);
    if (!files || !files.length) throw 'Tidak ada file ditemukan';

    let teks = `*TERABOX DOWNLOADER*\n\nDitemukan ${files.length} file:\n`;
    files.slice(0, 10).forEach((f, i) => {
      const nama = f.server_filename || f.filename || f.name || 'tanpa nama';
      teks += `\n${i + 1}. ${nama}\n   ${formatSize(f.size)}`;
    });
    if (files.length > 10) teks += `\n\n...dan ${files.length - 10} file lainnya`;

    const pertama = files[0];
    const namaFile = pertama.server_filename || pertama.filename || pertama.name || 'file';
    if (pertama.dlink) {
      await conn.sendMessage(m.chat, {
        document: { url: pertama.dlink },
        fileName: namaFile,
        mimetype: 'application/octet-stream',
        caption: teks
      }, { quoted: m });
    } else {
      m.reply(teks + '\n\nLink download tidak tersedia, coba lagi nanti.');
    }
  } catch (e) {
    m.reply('Gagal ambil data Terabox:\n' + (e.message || e));
  }
};

handler.help = ['terabox <link>'];
handler.tags = ['downloader'];
handler.command = ['terabox', 'teradl', 'trdl', 'tbox'];
handler.limit = true;
handler.register = true;

module.exports = handler;
