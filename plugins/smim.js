const fs = require('fs')
const fetch = require('node-fetch') // Tambahan untuk mengunduh URL ke Buffer
const uploadMedia = require('../lib/uploadImage') // file uploader
const { MessageType } = require('@adiwajshing/baileys')

let handler = async (m, { conn, text, usedPrefix, command}) => {
  
  // --- PENGECEKAN TEKS KOSONG ---
  if (!text) {
    throw `Teks tidak boleh kosong!\n\nContoh penggunaan:\n*${usedPrefix + command} teks atas|teks bawah*`
  }
  // ------------------------------

  let [atas, bawah] = text.split('|')
  let teks1 = atas ? atas.trim() : '-'
  let teks2 = bawah ? bawah.trim() : '-'

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw `Balas gambar dengan perintah:\n${usedPrefix + command} teks atas|teks bawah`
  if (!/image\/(jpe?g|png|webp)/.test(mime)) throw `Mime ${mime} tidak didukung!`

  let img = await q.download()
  let url = await uploadMedia(img)

  if (!url) throw 'Gagal upload gambar ke server hosting'

  let meme = `https://api.memegen.link/images/custom/${encodeURIComponent(teks1)}/${encodeURIComponent(teks2)}.png?background=${url}`

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key}})

    // === PERUBAHAN UTAMA DI SINI ===
    // Unduh URL meme menjadi Buffer terlebih dahulu agar EXIF tidak hilang
    let res = await fetch(meme)
    let buff = await res.buffer()

    // Kirim menggunakan Buffer (buff), bukan URL (meme)
    let sent = await conn.sendImageAsSticker(m.chat, buff, m, {
      packname: global.packname,
      author: global.author,
      isAiSticker: true,
      "android-app-store-link": "https://play.google.com/store/apps/details?id=me.pou.app", 
      "ios-app-store-link": "https://apps.apple.com/app/whatsapp-messenger/id310633997"
    })
    // ================================

    await conn.sendPresenceUpdate('composing', m.chat)
    
    // Hapus file sementara jika hasil fungsi me-return string path
    if (typeof sent === 'string' && fs.existsSync(sent)) {
        await fs.unlinkSync(sent)
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key}})
  } catch (e) {
    console.error(e)
    m.reply('Gagal membuat stiker, mengirim gambar sebagai alternatif...')
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key}})
    await conn.sendPresenceUpdate('composing', m.chat)
    await conn.sendFile(m.chat, meme, 'image.png', 'Jadikan stiker manual dengan mengetik .s', m)
  }
}

handler.help = ['smim <teks atas>|<teks bawah>']
handler.tags = ['sticker']
handler.command = /^(smim|smeme)$/i
handler.limit = true
handler.register = true

module.exports = handler