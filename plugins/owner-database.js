let fs = require('fs')
let fetch = require('node-fetch')
let handler  = async (m, { conn, text }) => {
m.reply('Tunggu Sebentar, Proses Getting File database.json')

/*let db = fs.readFileSync('./database.json')*/

let db = `./database.json`

/*await conn.sendFile(m.chat, db, 'database.json', 'Database berhasil dikirim!', m)*/

let nama = 'database.json'

conn.sendMessage(m.chat, { document: { url: db }, mimetype: 'application/json', fileName: nama }, { quoted: m})
}

handler.help = ['getdb','getdatabase'].map(v => v + ' <teks>')
handler.tags = ['owner']
handler.command = /^(db|getdb)$/i
handler.owner = true
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.fail = null
module.exports = handler