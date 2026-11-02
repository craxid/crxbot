let handler = async (m, { conn, text }) => {
  // unban itu khusus akun pribadi (user), urusan grup pakai .unmute
  let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null
  if (!who) throw 'Masukkan nomor/mention user yang ingin di unban\n\nExample: .unban 6282361160044'
  let user = global.db.data.users[who]
  if (!user) throw 'Nomor tidak ada di database!'
  user.banned = false
  m.reply(`Berhasil unban user ${who.split('@')[0]}. User itu bisa pakai bot lagi.`)
}
handler.help = ['unban']
handler.tags = ['owner']
handler.command = /^unban$/i
handler.owner = true
module.exports = handler
