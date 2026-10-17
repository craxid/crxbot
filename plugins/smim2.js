const fs = require('fs')
const sharp = require('sharp')
const { sticker} = require('../lib/sticker')

let handler = async (m, { conn, text, usedPrefix, command}) => {
  let [atas, bawah] = text.split('|')
  let teks1 = (atas || '').toUpperCase()
  let teks2 = (bawah || '').toUpperCase()

  let q = m.quoted? m.quoted: m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw `Balas gambar dengan perintah:\n${usedPrefix + command} <teks atas>|<teks bawah>`
  if (!/image\/(jpe?g|png|webp)/.test(mime)) throw `_*Mime ${mime} tidak didukung!*_`

  let imgBuffer = await q.download()

  // Buat gambar meme dengan teks atas dan bawah
  let memeBuffer = await sharp(imgBuffer)
.resize(512, 512, { fit: 'cover'})
.composite([
      {
        input: Buffer.from(
          `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <style>
.text {
                font-family: "Segoe UI Emoji", "Arial Unicode MS", Impact, sans-serif;
                font-size: 60px;
                font-weight: 900;
                fill: white;
                stroke: black;
                stroke-width: 4px;
                stroke-linejoin: round;
                paint-order: stroke fill;
                text-anchor: middle;
                dominant-baseline: middle;
}
            </style>
            <text x="256" y="75" class="text">${teks1}</text>
            <text x="256" y="490" class="text">${teks2}</text>
          </svg>`
),
        top: 0,
        left: 0
}
    ])
.png()
.toBuffer()

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key}})

    let stiker = await sticker(null, memeBuffer, global.packname, global.author)
    await conn.sendImageAsSticker(m.chat, memeBuffer, m, {
      packname: global.packname,
      author: global.author
})

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key}})
} catch (e) {
    m.reply('Gagal membuat stiker, mengirim gambar sebagai alternatif.')
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key}})
    await conn.sendFile(m.chat, memeBuffer, 'meme.png', 'JADIKAN STIKER SECARA MANUAL DENGAN MENGETIK.s', m)
}
}

handler.help = ['smim2 <teks atas>|<teks bawah>']
handler.tags = ['sticker']
handler.command = /^(smim2|smeme2)$/i
handler.limit = true
handler.register = true
module.exports = handler