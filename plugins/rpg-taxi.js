let handler = async (m, { conn }) => {
  let __timers = (new Date - global.db.data.users[m.sender].lasttaxi)
  let _timers = (3600000 - __timers)
  let order = global.db.data.users[m.sender].taxi
  let timers = clockString(_timers)
  let name = conn.getName(m.sender)
  let user = global.db.data.users[m.sender]
  let id = m.sender
  let kerja = 'taxi'

  conn.misi = conn.misi ? conn.misi : {}

  if (id in conn.misi) {
    conn.reply(m.chat, `Selesaikan orderan taxi kamu ${conn.misi[id][0]} Terlebih Dahulu`, m)
    throw false
  }

  if (new Date - user.lasttaxi > 3600000) {
    let randomaku1 = Math.floor(Math.random() * 10000)
    let randomaku2 = Math.floor(Math.random() * 100)

    let arr = [
      '🔍Mencari orderan buat kamu.....',
      `🚶⬛⬛⬛⬛⬛⬛⬛⬛⬛ ⬛⬜⬜⬜⬛⬜⬜⬜⬛⬛ ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 🏘️🏘️🏘️🏘️🌳 🌳 🏘️ 🚕 \n✔️ Mendapatkan orderan....`,
      `🚶⬛⬛⬛⬛⬛🚐⬛⬛⬛🚓🚚 🚖⬜⬜⬜⬛⬜⬜⬜🚓⬛🚑 ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🚙 🏘️🏘️🏢️🌳 🌳 🏘️ 🏘️🏡 \n🚖 Mengantar Ke tujuan.....`,
      `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🚓 ⬛⬜🚗⬜⬜⬛⬜🚐⬜⬜⬛🚙🚚🚑 ⬛⬛⬛⬛🚒⬛⬛⬛⬛⬛⬛🚚 🏘️🏘️🏘️🏘️🌳 🌳 🏘️ \n🚖 Selesai Mengantar Pelanggan....`,
      `➕ 💹Menerima gaji....`,
      `*—[ Hasil taxi ${m.name} ]—* 
- ➕ 💹 Uang = [ ${randomaku1} ] 
- ➕ ✨ Exp = [ ${randomaku2} ] 
- ➕ 😍 Order Selesai = +1 
- ➕ 📥Total Order Sebelumnya : ${order}`,
    ]

    let { key } = await conn.sendMessage(m.chat, { text: arr[0] }, { quoted: m })

    for (let i = 1; i < arr.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      await conn.sendMessage(m.chat, { text: arr[i], edit: key })
    }

    user.money += randomaku1
    user.exp += randomaku2
    user.taxi += 1
    conn.misi[id] = [kerja, setTimeout(() => { delete conn.misi[id] }, 27000)]
    user.lasttaxi = new Date * 1
  } else m.reply(`kamu kecapean, istirahat dulu selama ${timers}, baru gas ngorder lagi`)
}

handler.help = ['taxi']
handler.tags = ['rpg']
handler.command = /^(taxi)$/i
handler.register = true
handler.group = true

module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}