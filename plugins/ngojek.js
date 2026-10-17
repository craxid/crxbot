let fetch = require('node-fetch')

let handler = async (m, { conn, usedPrefix, command }) => {
  let __timers = (new Date - global.db.data.users[m.sender].lastngojek)
  let _timers = (3600000 - __timers)
  let order = global.db.data.users[m.sender].ojekk
  let timers = clockString(_timers)
  let name = `@${m.sender.split`@`[0]}`
  let user = global.db.data.users[m.sender]

  if (new Date - global.db.data.users[m.sender].lastngojek > 3600000) {
    let randomaku1 = `${Math.floor(Math.random() * 10)}`
    let randomaku2 = `${Math.floor(Math.random() * 10)}`
    let randomaku4 = `${Math.floor(Math.random() * 6)}`
    let randomaku3 = `${Math.floor(Math.random() * 10)}`
    let randomaku5 = `${Math.floor(Math.random() * 10)}`.trim()
    let rbrb1 = (randomaku1 * 2)
    let rbrb2 = (randomaku2 * 10)
    let rbrb3 = (randomaku3 * 1)
    let rbrb4 = (randomaku4 * 1237)
    let rbrb5 = (randomaku5 * 15)
    var zero1 = `${rbrb1}`
    var zero2 = `${rbrb2}`
    var zero3 = `${rbrb3}`
    var zero4 = `${rbrb4}`
    var zero5 = `${rbrb5}`

    let arr = [
      'Mencari Pelanggan...',
      'Mendapatkan Orderan...',
      `🚶🛵⬛⬛⬛⬛⬛⬛⬛⬛ ⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛ ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 🏘️🏘️🏘️🏘️🌳 🌳 🏘️ \n➕ Mengantar ke tujuan....`,
      `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ ⬛⬜⬜⬛⬛⬜⬜⬜⬛⬛ ⬛⬛⬛⬛⬛⬛⬛🛵⬛⬛ 🏘️🏘️🏘️🏘️🌳 🌳 🏘️ \n➕ Sampai di tujuan...`,
      `➕ 💹Menerima gaji....`,
      `*—[ Hasil Ngojek ${m.name} ]—*
* ➕ 💰 Money = [ ${zero4} ] 
* ➕ ✨ Exp = [ ${zero5} ] 
* ➕ 😍 Order Selesai = +1
* ➕ 📥 Total Order Sebelumnya : ${order} 

${wm}`,
    ]

    let { key } = await conn.sendMessage(m.chat, { text: arr[0] }, { quoted: m })

    for (let i = 1; i < arr.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      await conn.sendMessage(m.chat, { text: arr[i], edit: key })
    }

    global.db.data.users[m.sender].money += rbrb4
    global.db.data.users[m.sender].exp += rbrb5
    global.db.data.users[m.sender].ojekk += 1
    user.lastngojek = new Date * 1
  } else m.reply(`Kamu lelah setelah ngojek\nSilahkan tunggu *${timers}*`)
}

handler.help = ['ojek']
handler.tags = ['game']
handler.command = /^(ojek|ngojek|gojek)$/i
handler.group = true
handler.register = true

module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  console.log({ ms, h, m, s })
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}