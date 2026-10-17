const { sticker } = require('../lib/sticker')
const uploadFile = require('../lib/uploadFile')
const uploadImage = require('../lib/uploadImage')
let { webp2png } = require('../lib/webp2mp4')
let fetch = require("node-fetch")

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    if (/video/g.test(mime)) {
        if ((q.msg || q).seconds > 11) return m.reply('Maksimal 10 detik!')
    }

    try {
        let img = await q.download()
        if (!img) throw `balas gambar/video/stiker dengan perintah ${usedPrefix + command}`

        // Tambahkan reaksi saat mulai memproses
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }})

        let packname = text || global.wm
        let author = m.name

        let stiker
        if (/video/g.test(mime) || (q.msg || q).seconds) {
            // Menggunakan sendVideoAsSticker jika tersedia, ditambah tag AI
            stiker = await conn.sendVideoAsSticker(m.chat, img, m, { packname, author, isAiSticker: true })
        } else {
            // Menggunakan sendImageAsSticker untuk gambar/stiker statis, ditambah tag AI
            stiker = await conn.sendImageAsSticker(m.chat, img, m, { packname, author, isAiSticker: true })
        }

        // Tambahkan reaksi sukses setelah selesai
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }})

    } catch (e) {
        console.error(e)
        // Jika gagal, berikan reaksi gagal
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }})
        
        try {
            let img = await q.download()
            // Menambahkan parameter tag AI di fungsi fallback sticker()
            // Urutan parameter: img, url, packname, author, categories, extra
            let buff = await sticker(img, false, text || global.wm, m.name, [''], { isAiSticker: true })
            await conn.sendFile(m.chat, buff, 'sticker.webp', '', m)
        } catch (err) {
            throw 'Gagal!, Balas Gambar/video dengan caption *.stiker*'
        }
    }
}

handler.help = ['wm', 'watermark']
handler.tags = ['sticker']
handler.command = /^(wm|watermark|colong|take?)$/i
handler.limit = 3
handler.premium = false

module.exports = handler

const isUrl = (text) => {
  return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'))
}