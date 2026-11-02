let handler = async (m, { conn, participants }) => {
  // .mute itu matiin respon bot di chat ini aja, beda sama banchat
    global.db.data.chats[m.chat].mute = true
    m.reply('Berhasil mute chat, Bot tidak akan respon di chat ini. Ketik .unmute untuk mengaktifkan lagi.')
}
handler.help = ['mute']
handler.tags = ['owner']
handler.command = ['mute']
handler.owner = true
handler.group = true // .mute cuma buat di grup

module.exports = handler
