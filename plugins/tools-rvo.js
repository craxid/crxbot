let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m
  try {
    let media = await q.download?.()
    let text = q.text || q.body || ''
    await conn.sendFile(m.chat, media, null, text, m)
  } catch (e) {
    m.reply('Media gagal dimuat!')
  }
}

handler.help = ['readviewonce', 'revive']
handler.tags = ['tools', 'group']
handler.command = ['readviewonce', 'read', 'rvo', 'liat', 'readvo', 'revive']
handler.premium = false
handler.register = false
handler.fail = null
module.exports = handler