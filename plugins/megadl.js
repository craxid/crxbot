const { File } = require('megajs');
// Kita tidak perlu lagi 'file-type' karena untuk stream, 
// WhatsApp sudah otomatis mendeteksi tipe file dari properti fileName.

let handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.room = conn.room ? conn.room : {};
  
  if (!args[0]) return m.reply(`Masukkan Url!\n\nContoh :\n${usedPrefix + command} https://mega.nz/file/FltHDCzD#oNm8SD_e9oFTCczmnEW4zB9gsakSGzVaVtd9euj7yK8`);
  
  if (!/mega\.nz/i.test(args[0])) return m.reply('URL tidak valid! Harap masukkan link Mega.nz yang benar.');

  let id = 'mega_' + m.sender;
  if (id in conn.room) return m.reply('Tunggu sebentar, kamu masih memiliki unduhan yang sedang berjalan!');
  
  conn.room[id] = true;
  
  try {
    m.reply('_⏳ Sedang membaca metadata file, harap tunggu..._');
    
    let file = File.fromURL(args[0]);
    await file.loadAttributes();

    // Limit ukuran file diubah ke 500 MB (atau sesuaikan dengan kebutuhanmu)
    // Karena kita pakai stream, bot tidak akan crash, tapi WhatsApp punya limit pengiriman dokumen (~2GB)
    const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
    if (file.size > MAX_SIZE) {
      return m.reply(`❌ Ukuran file terlalu besar untuk dikirim via WhatsApp! (Maksimal 500MB)\n\nNama: ${file.name}\nUkuran: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    m.reply(`_📥 Mengunduh & mengirim file: *${file.name}* (${(file.size / 1024 / 1024).toFixed(2)} MB)..._\n\n_Proses ini tidak akan memakan RAM servermu._`);

    // Ganti downloadBuffer() menjadi download() untuk mendapatkan Readable Stream
    let stream = file.download();

    // Kirim langsung menggunakan stream ke WhatsApp (kompatibel dengan Baileys terbaru)
    await conn.sendMessage(m.chat, { 
      document: { stream: stream }, 
      fileName: file.name, 
      mimetype: 'application/octet-stream' // WA akan membaca mime dari ekstensi file.name
    }, { quoted: m });

  } catch (e) {
    console.log(e);
    m.reply(`❌ Terjadi Kesalahan\n\n${e.message || e}`);
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