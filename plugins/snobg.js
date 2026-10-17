const fs = require('fs')
const uploadImage = require('../lib/uploadImage')
const { MessageType } = require('@adiwajshing/baileys')
const { sticker } = require('../lib/sticker')
let handler = async (m, { conn, text, usedPrefix, command }) => {

    let [atas, bawah] = text.split`|`
    
    let teks1 = text.split('|')[0] ? text.split('|')[0] : '-'
  let teks2 = text.split('|')[1] ? text.split('|')[1] : '-'
  
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime) throw `balas gambar dengan perintah\n\n${usedPrefix + command} <${atas ? atas : 'teks atas'}>|<${bawah ? bawah : 'teks bawah'}>`
    if (!/image\/(jpe?g|png|webp)/.test(mime)) throw `_*Mime ${mime} tidak didukung!*_`
    let img = await q.download()
    let url = await uploadImage(img)
    let raw = await  conn.getFile(`https://api.ouzen.xyz/convert/sticker-nobg?url=${url}&apikey=${global.andarazCekapi || "zenzkey_f59c1aacf2"}`)

let hasil = await raw

try {

await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key}})

    let stiker = await sticker(null, hasil.data, global.packname, global.author)

let tes = await conn.sendImageAsSticker(m.chat, hasil.data, m, { packname: global.packname, author: global.author })

await fs.unlinkSync(tes)
    
await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key}})

//await conn.sendFile(m.chat, stiker, { quoted: m })
  } catch (e) {
    m.reply('gagal membuat stiker, Mencoba Mengirim gambar')
    

await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key}})

    await conn.sendFile(m.chat, hasil.data, 'image.png', 'JADIKAN STIKER SECARA MANUAL DENGAN MENGETIK .s', m)
  }
}
handler.help = ['stickernobg']
handler.tags = ['sticker']
handler.command = /^(snobg|stickernobg|sbg)$/i
handler.limit = true
module.exports = handler