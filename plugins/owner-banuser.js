let handler = async (m, { conn, text }) => {
  // ban itu khusus akun pribadi (user), urusan grup pakai .mute
  let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null
  if (!who) throw 'Masukkan nomor/mention user yang ingin di ban\n\nExample: .ban 6282361160044'
  let user = global.db.data.users[who]
  if (!user) throw 'Nomor tidak ada di database!'
  user.banned = true
  m.reply(`Berhasil ban user ${who.split('@')[0]}. User itu tidak bisa pakai bot lagi sampai di-unban.`)
}
handler.help = ['ban']
handler.tags = ['owner']
handler.command = /^ban$/i
handler.owner = true
module.exports = handler
