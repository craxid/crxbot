const fetch = require('node-fetch')

let poin = 20
let timeout = 120000
let limit = 0
let money = 1000
let src
let handler = async (m, { conn, usedPrefix }) => {
    conn.tebakbendera = conn.tebakbendera ? conn.tebakbendera : {}
    let id = m.chat
    if (id in conn.tebakbendera) {
        conn.reply(m.chat, 'Masih ada soal belum terjawab di chat ini', conn.tebakbendera[id][0])
        throw false
    }
    if (!src) src = await (await fetch(global.API('https://raw.githubusercontent.com', '/BochilTeam/database/master/games/tebakbendera.json'))).json()
    

    let json = src[Math.floor(Math.random() * src.length)]
    if (!json) throw json
    let caption = `
Kode Negara: *${json.flag}*

Timeout *${(timeout / 1000).toFixed(2)} detik*
Ketik ${usedPrefix}tekbe untuk bantuan

`.trim()
    conn.tebakbendera[id] = [
        await conn.sendFile(m.chat, json.img, 'img.jpg', caption, m),
        json, poin,
        setTimeout(() => {
            if (conn.tebakbendera[id]) conn.reply(m.chat, `Waktu habis!`, conn.tebakbendera[id][0])
            delete conn.tebakbendera[id]
        }, timeout)
    ]
}
handler.help = ['tebakbendera']
handler.tags = ['game']
handler.command = /^tebakbendera/i
handler.group = true
handler.register = true

module.exports = handler