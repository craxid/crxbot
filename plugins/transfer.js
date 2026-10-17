const items = ['limit', 'money']
let confirmation = {}
async function handler(m, { conn, args, usedPrefix, command }) {
  if (confirmation[m.sender]) return m.reply('Kamu sedang melakukan transfer!')
  let user = global.db.data.users[m.sender]
  const item = items.filter(v => v in user && typeof user[v] == 'number')
  let lol = `✳️ Penggunaan perintah yang benar
  
*${usedPrefix + command}* [jenis item] [jumlah] [@user] 

📌 Contoh: *${usedPrefix + command}* limit 1 @${m.sender.split('@')[0]} 

📍 Item yang bisa ditransfer 
┌────────────── 
▢ *limit* = Limit 🔗 
▢ *money* = Uang 💰
└────────────── `.trim()
  const type = (args[0] || '').toLowerCase()
  if (!item.includes(type)) return conn.reply(m.chat, lol, m, { mentions: [m.sender] })
  const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : ''
  if (!who) return m.reply('✳️ Tag pengguna')
  if (!(who in global.db.data.users)) return m.reply(`✳️ Pengguna tidak ada dalam database`)
  if (user[type] * 1 < count) return m.reply(`✳️ *${type}* tidak cukup untuk ditransfer `)
  let confirm = `Kamu yakin ingin mentransfer *${count.toLocaleString('id-ID')}* _*${type}*_ ke *@${(who || '').replace(/@s\.whatsapp\.net/g, '')}*? 
  
Kamu memiliki waktu *60 detik* 
Balas _*ya*_ atau _*tidak*_ `.trim()
  m.reply(confirm, null, { mentions: [who] })
  confirmation[m.sender] = { sender: m.sender, to: who, message: m, type, count, timeout: setTimeout(() => (m.reply('⏳ Waktu habis, transfer dibatalkan.'), delete confirmation[m.sender]), 60 * 1000) }
}
handler.before = async m => {
  if (m.isBaileys) return
  if (!(m.sender in confirmation)) return
  if (!m.text) return
  let { timeout, sender, message, to, type, count } = confirmation[m.sender]
  if (m.id === message.id) return
  let user = global.db.data.users[sender]
  let _user = global.db.data.users[to]
  if (/tidak?/g.test(m.text.toLowerCase())) {
    clearTimeout(timeout)
    delete confirmation[sender]
    return m.reply('✅ Transfer dibatalkan')
  }
  if (/ya?/g.test(m.text.toLowerCase())) {
    let previous = user[type] * 1
    let _previous = _user[type] * 1
    user[type] -= count * 1
    _user[type] += count * 1
    if (type === 'money') {
      m.reply(`*✅ Transfer Berhasil* 

📦 Detail Transfer: 
*🧺 Jenis Item:* ${type} 
*🔢 Jumlah Item:* Rp ${count.toLocaleString('id-ID')}
*👤 Akun Tujuan:* @${(to || '').replace(/@s\.whatsapp\.net/g, '')} 

*💸 Transfer telah diproses dengan sukses!*

*👍 Terima kasih telah menggunakan layanan kami!*`, null, { mentions: [to] })
    } else {
      m.reply(`*✅ Transfer Berhasil* 

📦 Detail Transfer:
*🧺 Jenis Item:* ${type} 
*🔢 Jumlah Item:* ${count.toLocaleString('id-ID')}
*👤 Akun Tujuan:* @${(to || '').replace(/@s\.whatsapp\.net/g, '')} 

*💸 Transfer telah diproses dengan sukses!*

*👍 Terima kasih telah menggunakan layanan kami!*`, null, { mentions: [to] })
    }
    clearTimeout(timeout)
    delete confirmation[sender]
  }
}
handler.help = ['transfer'].map(v => v + ' [jenis] [jumlah] [@tag]')
handler.tags = ['game', 'main']
handler.group = true
handler.command = ['transfer', 'tf']
handler.disabled = false
module.exports = handler
function isNumber(x) {
  return !isNaN(x)
}
