const uploadFile = require('../lib/uploadFile')
const uploadImage = require('../lib/uploadImage')

// Tambahkan parameter { conn } di sini untuk memanggil fungsi bawaan bot
let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw 'Tidak ada media yang ditemukan'
  
  // ✅ BERIKAN REAKSI JAM PASIR PADA PESAN PENGGUNA
  // (Jika script bot Anda punya shortcut, ini sama dengan: await m.react('⏳'))
  await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })
  
  // Mengambil nama file dari metadata pesan
  let fileName = q.fileName || (q.msg || q).fileName || 'file'

  let media = await q.download()
  
  // Cek apakah file berupa gambar/mp4 (uploadImage) atau file biasa (uploadFile/Google Drive)
  let isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime)
  
  let fileSizeLimit = 20 * 1024 * 1024
  if (media.length > fileSizeLimit) {
    // Jika gagal karena ukuran, ubah reaksi jadi tanda silang
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    throw 'Ukuran media tidak boleh melebihi 20MB'
  }
  
  // Eksekusi fungsi upload berdasarkan tipe file
  let link = await (isTele ? uploadImage : uploadFile)(media, fileName)
  
  // Format ukuran file
  let fileSize = media.length
  let unit = 'Byte(s)'
  if (fileSize >= 1024) {
    fileSize /= 1024
    unit = 'KB'
  }
  if (fileSize >= 1024) {
    fileSize /= 1024
    unit = 'MB'
  }
  fileSize = fileSize.toFixed(2)
  
  // Menentukan pesan status berdasarkan tempat penyimpanan file
  let expiredText = isTele 
    ? '(Tidak Ada Tanggal Kedaluwarsa)' 
    : '(File Sementara: Terhapus otomatis dalam 24 Jam)'

  // ✅ UBAH REAKSI JADI CENTANG KETIKA SUKSES
  await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  // Kirim balasan link ke user
  m.reply(`*Berhasil diunggah!*
${link} 

*Ukuran File:* ${fileSize} ${unit} 
${expiredText}`)
}

handler.help = ['tourl <reply media>']
handler.tags = ['tools']
handler.command = /^(upload|tourl)$/i
handler.limit = true

module.exports = handler