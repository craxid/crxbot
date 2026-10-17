const fs = require('fs')
const fetch = require('node-fetch')
const { sticker } = require('../lib/sticker')

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
	
if (!args[0]) throw `📌 Contoh : ${usedPrefix + command} 😎+🤑`

if (!text.includes('+')) throw  `✳️ Pisahkan dengan *+* \n\n📌 Contoh : \n*${usedPrefix + command}* 😎+🤑`

try {
    await conn.sendPresenceUpdate('composing', m.chat)
    await m.reply(stiker_wait)

    let [emoji, emoji2] = text.split`+`

    // Fetch URL gambar dari API Emoji Kitchen
    let urlGambar = `https://emojik.vercel.app/s/${encodeURIComponent(emoji.trim())}_${encodeURIComponent(emoji2.trim())}?size=512`

    // Eksekusi pembuatan stiker dengan tambahan metadata
    let tes = await conn.sendImageAsSticker(m.chat, urlGambar, m, { 
        packname: global.packname, 
        author: global.author,
        isAiSticker: true,
        "android-app-store-link": "https://play.google.com/store/apps/details?id=me.pou.app", 
        "ios-app-store-link": "https://apps.apple.com/app/whatsapp-messenger/id310633997"
    })

    await conn.sendPresenceUpdate('composing', m.chat)
    await fs.unlinkSync(tes)

} catch (err) {
    console.log (err)
    throw (`${err}`)
}
}

handler.help = ['emojimix']
handler.tags = ['sticker']
handler.command = ['emojimix'] 
handler.limit = true
handler.group = true
module.exports = handler