//import db from '../lib/database.js'

const { createHash } = require('crypto')

let handler = async function (m, { conn, args, usedPrefix}) {
  if (!args[0]) throw `✳️ *Masukan nomor seri*\nPeriksa nomor serimu dengan perintah...\n\n*${usedPrefix}mysn*`
  let user = global.db.data.users[m.sender]
  let sn = createHash('md5').update(m.sender).digest('hex')
  if (args[0] !== sn) throw '⚠️ *Nomor seri tidak ditemukan*' 
  user.registered = false
  m.reply(`✅ Berhasil menghapus user dari database`)
}
handler.help = ['unreg <nomor seri>'] 
handler.tags = ['main']

handler.command = ['unreg'] 
handler.register = true

module.exports = handler