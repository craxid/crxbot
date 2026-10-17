const { createHash } = require ('crypto')

let handler = async function (m, { conn, text, usedPrefix }) {
let sn = createHash('md5').update(m.sender).digest('hex')
await conn.sendPresenceUpdate('composing', m.chat)
m.reply(`
▢ *Nomor seri*: ${sn}

Gunakan Serial Number ini untuk unreg / registrasi ulang
`.trim())
}
handler.help = ['mysn']
handler.tags = ['main']
handler.command = ['myseri', 'sn', 'mysn'] 
handler.register = true

module.exports = handler