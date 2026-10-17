const uploadDrive = require('../lib/uploadDrive')

// Tambahkan parameter { conn } di sini untuk memanggil fungsi bawaan bot
let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw 'Tidak ada media yang ditemukan. Reply media yang ingin diupload ke Google Drive.'
  
  // ✅ BERIKAN REAKSI JAM PASIR PADA PESAN PENGGUNA
  await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })
  
  // Mengambil nama file dari metadata pesan
  let fileName = q.fileName || (q.msg || q).fileName || 'file'

  let media = await q.download()
  
  // Batas ukuran file 20 MB (sesuaikan jika GAS/bot kamu sanggup lebih besar)
  let fileSizeLimit = 20 * 1024 * 1024
  if (media.length > fileSizeLimit) {
    // Jika gagal karena ukuran, ubah reaksi jadi tanda silang
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    throw 'Ukuran media tidak boleh melebihi 20MB'
  }
  
  try {
    // Eksekusi fungsi upload khusus Google Drive
    let link = await uploadDrive(media, fileName)
    
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
    
    // ✅ UBAH REAKSI JADI CENTANG KETIKA SUKSES
    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

    // Kirim balasan link ke user
    m.reply(`*Berhasil diunggah ke Google Drive!*
${link} 

*Ukuran File:* ${fileSize} ${unit} 
*(Tersimpan Permanen di Google Drive)*`)

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    throw `Gagal mengunggah file ke Google Drive. Error: ${e.message || e}`
  }
}

handler.help = ['todrive <reply media>']
handler.tags = ['tools']
handler.command = /^(todrive|togdrive|drive)$/i
handler.limit = true

module.exports = handler