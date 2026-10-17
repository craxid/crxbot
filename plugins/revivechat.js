let handler = async (m, { conn }) => {
  if (m.messageStubType === 68) { // 68 adalah kode untuk pesan yang dihapus
    let msg = await conn.loadMessage(m.chat, m.messageStubParameters[0])
    if (msg) {
      let teks = `Pesan yang dihapus:\n\n${msg.text || ''}`
      if (msg.mediaMessage) {
        if (msg.mediaMessage.imageMessage) {
          await conn.sendFile(m.chat, await conn.getFile(msg.mediaMessage.imageMessage.url), 'image.jpg', teks, m)
        } else if (msg.mediaMessage.videoMessage) {
          await conn.sendFile(m.chat, await conn.getFile(msg.mediaMessage.videoMessage.url), 'video.mp4', teks, m)
        } else {
          await conn.sendMessage(m.chat, teks, 'conversation')
        }
      } else {
        await conn.sendMessage(m.chat, teks, 'conversation')
      }
    }
  }
}

handler.before = true
handler.command = ['revivechat']
handler.tags = ['tools', 'group']

module.exports = handler