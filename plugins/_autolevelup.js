// auto levelup tiap ada pesan masuk, biar flag user.autolevelup beneran kepake
// (sebelumnya flag-nya cuma di-set true tapi gak ada yg baca)
let levelling = require('../lib/levelling')

let handler = m => m
handler.all = async function (m) {
  if (m.fromMe) return
  let user = global.db.data.users[m.sender]
  if (!user || !user.autolevelup) return
  let before = user.level
  while (levelling.canLevelUp(user.level, user.exp, global.multiplier)) user.level++
  if (user.level !== before) {
    m.reply(`Selamat, kamu naik level!\n*${before}* -> *${user.level}*\ngunakan *.profile* untuk mengecek`.trim())
  }
}

module.exports = handler