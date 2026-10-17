let fetch = require('node-fetch')

let timeout = 180000
let poin = 50
let money = 100
let limit = 0
let handler = async (m, { conn, usedPrefix }) => {
    
    conn.asahotak = conn.asahotak ? conn.asahotak : {}
    
    let id = m.chat
    if (id in conn.asahotak) {
        
        conn.reply(m.chat, 'Masih ada soal belum terjawab di chat ini', conn.asahotak[id][0])
        throw false
    }
    
let src = await (await fetch('https://raw.githubusercontent.com/BochilTeam/database/master/games/asahotak.json')).json()
    let json = src[Math.floor(Math.random() * src.length)]
    
    let caption = `
${json.soal}

Timeout *${(timeout / 1000).toFixed(2)} detik*
Ketik ${usedPrefix}ao untuk bantuan
`.trim()
    conn.asahotak[id] = [
        await conn.reply(m.chat, caption, m),
        json, poin,
        setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
if (conn.asahotak[id]) conn.reply(m.chat, `Waktu habis!`, conn.asahotak[id][0])
delete conn.asahotak[id]
}, timeout)
    ]
}
handler.help = ['asahotak']
handler.tags = ['game']
handler.command = /^asahotak/i
handler.limit = false
handler.group = true
handler.register = true

module.exports = handler