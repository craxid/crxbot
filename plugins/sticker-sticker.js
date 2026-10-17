const fs = require('fs')

let handler = async (m, { conn, command, usedPrefix }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (/image/.test(mime)) {
        let media = await q.download()
        m.reply(stiker_wait)
        let encmedia = await conn.sendImageAsSticker(m.chat, media, m, {
            packname: global.packname,
            author: global.author,
            isAiSticker: true,
            "android-app-store-link": "https://play.google.com/store/apps/details?id=me.pou.app", 
            "ios-app-store-link": "https://apps.apple.com/app/whatsapp-messenger/id310633997"
        })
        await fs.unlinkSync(encmedia)
    } else if (/video/.test(mime)) {
        if ((q.msg || q).seconds > 8) return m.reply('maksimal 8 detik!')
        let media = await q.download()
        m.reply(stiker_wait)
        let encmedia = await conn.sendVideoAsSticker(m.chat, media, m, {
            packname: global.packname,
            author: global.author,
            isAiSticker: true,
            "android-app-store-link": "https://play.google.com/store/apps/details?id=me.pou.app", 
            "ios-app-store-link": "https://apps.apple.com/app/whatsapp-messenger/id310633997" 
        })
        await fs.unlinkSync(encmedia)
    } else {
        throw `Kirim Gambar/Video Dengan Caption ${usedPrefix + command}\nDurasi Video 1-6 Detik`
    }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = /^(stiker|s|sticker)$/i
handler.limit = true
module.exports = handler

const isUrl = (text) => {
    return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png|mp4)/, 'gi'))
}