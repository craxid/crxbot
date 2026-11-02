const { File } = require('megajs');

function getMime(nama) {
  const ext = nama.split('.').pop().toLowerCase();
  const mimes = {
    mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    m4a: 'audio/mp4', flac: 'audio/flac', aac: 'audio/aac',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    pdf: 'application/pdf', zip: 'application/zip',
    rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
    apk: 'application/vnd.android.package-archive',
    txt: 'text/plain', doc: 'application/msword',
    epub: 'application/epub+zip'
  };
  return mimes[ext] || 'application/octet-stream';
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.room = conn.room ? conn.room : {};
  if (!args[0]) return m.reply('Masukkan Url!');
  if (!/mega\.nz/i.test(args[0])) return m.reply('URL tidak valid!');
  let id = 'mega_' + m.sender;
  if (id in conn.room) return m.reply('Tunggu sebentar!');
  conn.room[id] = true;
  try {
    m.reply(wait);
    let megaUrl = args[0]; try { megaUrl = decodeURIComponent(megaUrl); } catch(e) {}
    let file = File.fromURL(megaUrl);
    await file.loadAttributes();
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) return m.reply('File terlalu besar (maks 500MB)');
    let stream = file.download();
    await conn.sendMessage(m.chat, {
      document: { stream: stream },
      fileName: file.name,
      mimetype: getMime(file.name),
      caption: '*' + file.name + '*\n' + (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }, { quoted: m });
  } catch (e) {
    console.log(e);
    m.reply('Terjadi Kesalahan\n\n' + (e.message || e));
  } finally {
    delete conn.room[id];
  }
};

handler.help = ['mega <url>'];
handler.tags = ['downloader'];
handler.limit = true;
handler.register = true;
handler.command = /^mega(dl)?$/i;
module.exports = handler;
