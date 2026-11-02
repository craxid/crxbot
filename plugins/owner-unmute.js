// antre pilihan unmute, pola sama kayak konfirmasi di tools-gofile
let menunggu = {}

let handler = async (m, { conn, text }) => {
  // unmute itu khusus grup (bot diam di grup), urusan akun pribadi pakai .unban
  // .unmute <id grup> -> langsung unmute grup itu
  if (text && text.trim().endsWith('g.us')) {
    let target = text.trim()
    let chat = global.db.data.chats[target]
    if (!chat) throw 'Chat tidak ada di database.'
    chat.mute = false
    return m.reply('Berhasil unmute grup ' + target + '.')
  }

  // di dalam grup tanpa argumen -> langsung unmute grup ini
  if (m.isGroup) {
    global.db.data.chats[m.chat].mute = false
    return m.reply('Berhasil unmute. Bot aktif lagi di grup ini.')
  }

  // di chat pribadi owner dikasih daftar grup yg lagi mute, tinggal balas angkanya
  if (menunggu[m.sender]) return m.reply('Masih ada daftar unmute yang menunggu. Balas angkanya, atau ketik *batal*.')
  let grupMute = Object.entries(global.db.data.chats).filter(([id, c]) => id.endsWith('g.us') && c.mute)
  if (!grupMute.length) return m.reply('Tidak ada grup yang sedang di-mute.')

  let teks = '*Grup yang sedang di-mute:*\n'
  for (let i = 0; i < grupMute.length; i++) {
    let nama = grupMute[i][0]
    try { nama = (await conn.getName(grupMute[i][0])) || nama } catch (e) {}
    teks += '\n' + (i + 1) + '. ' + nama
  }
  teks += '\n\nBalas dengan *nomornya* untuk unmute. Berlaku 60 detik, ketik *batal* untuk membatalkan.'
  await m.reply(teks)
  menunggu[m.sender] = {
    sender: m.sender,
    daftar: grupMute.map(([id]) => id),
    message: m,
    timeout: setTimeout(() => (m.reply('⏳ Waktu habis, pilihan unmute dibatalkan.'), delete menunggu[m.sender]), 60 * 1000)
  }
}
handler.help = ['unmute']
handler.tags = ['owner']
handler.command = /^unmute$/i
handler.owner = true

// tangkap balasan angka dari owner buat milih grup di daftar
handler.before = async m => {
  if (m.isBaileys) return
  if (!(m.sender in menunggu)) return
  if (!m.text) return
  let data = menunggu[m.sender]
  if (m.id === data.message.id) return

  let jawab = m.text.trim()
  if (/^batal$/i.test(jawab)) {
    clearTimeout(data.timeout)
    delete menunggu[m.sender]
    return m.reply('✅ Pilihan unmute dibatalkan.')
  }

  let n = parseInt(jawab)
  if (!n || n < 1 || n > data.daftar.length) return // bukan nomor yg valid, abaikan aja

  let target = data.daftar[n - 1]
  clearTimeout(data.timeout)
  delete menunggu[m.sender]
  let chat = global.db.data.chats[target]
  if (!chat) return m.reply('Grup sudah tidak ada di database.')
  chat.mute = false
  return m.reply('✅ Berhasil unmute grup ' + target + '. Bot aktif lagi di sana.')
}

module.exports = handler
