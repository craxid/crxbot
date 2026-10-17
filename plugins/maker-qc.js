let { writeExifImg } = require('../lib/exif.js')
let axios = require('axios')
let fs = require('fs')

let handler = async (m, { conn, args }) => {
try {
    let text
    if (args.length >= 1) {
        text = args.slice(0).join(" ")
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else throw "Masukan teks atau balas teks yang ingin di jadikan quote!"
    
    if (!text) return m.reply('Masukan teks')
    if (text.length > 50) return m.reply('Maksimal 50 Karakter!')

    // Dikembalikan ke warna aslimu
    let randomColor = ['#2f3641']

    const apiColor = randomColor[Math.floor(Math.random() * randomColor.length)];

    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    
    // Mendapatkan URL Profile Picture
    let pp = await conn.profilePictureUrl(who, 'image').catch(_=> 'https://i.ibb.co/sQTkHLD/ppkosong.png')
    
    // Menyesuaikan nama dengan siapa yang di-quote
    let name = m.quoted ? (m.quoted.name || "User") : m.name

    const obj = {
      "type": "quote",
      "format": "png",
      "backgroundColor": apiColor,
      "width": 512,
      "height": 768,
      "scale": 2,
      "messages": [{
         "entities": [],
         "avatar": true,
         "from": {
            "id": 1,
            "name": name,
            "photo": {
               "url": pp
            }
         },
         "text": text,
         "replyMessage": {}
      }]
    }

    const { data } = await axios.post('https://quote.yuri.ly/generate', obj, {
      headers: {
         'Content-Type': 'application/json'
      }
    })
   
    const buffer = Buffer.from(data.result.image, 'base64')
    
    let packname = m.name
    let author = `QC Maker by ${global.author || 'Bot'}`
    
    // Kita gunakan writeExifImg yang sudah terbukti work untuk konversi dan EXIF
    let stikerPath = await writeExifImg(buffer, { packname, author, isAiSticker: true })
   
    await conn.sendPresenceUpdate('composing', m.chat)
    
    if (stikerPath) {
        // Baca file hasil konversi
        let stikerBuffer = fs.readFileSync(stikerPath)
        // Kirim ke WhatsApp
        await conn.sendFile(m.chat, stikerBuffer, 'Quotly.webp', '', m)
        // Hapus file temporer agar penyimpanan tidak penuh
        fs.unlinkSync(stikerPath) 
    }

} catch (e) {
    console.error(e)
    throw `Ups ada yang eror nih\n\n${e}`
}}

handler.help = ['qc']
handler.tags = ['sticker']
handler.command = /^(qc|quotely)$/i
handler.limit = true
handler.register = true

module.exports = handler