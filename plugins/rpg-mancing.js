let { MessageType } = require('@adiwajshing/baileys')
let wm = global.wm

let handler = async (m, { conn, usedPrefix, owner }) => {
  try {
    let user = global.db.data.users[m.sender]
    if (!user) return conn.reply(m.chat, 'Pengguna tidak ditemukan', m)

    let lastFishingTime = user.lastmancing || 0
    let timeDiff = Date.now() - lastFishingTime
    let remainingTime = 180000 - timeDiff

    if (user.fishingrod > 0) {
      if (timeDiff >= 180000) {
        let ikan = Math.floor(Math.random() * 30)
        let lele = Math.floor(Math.random() * 15)
        let nila = Math.floor(Math.random() * 10)
        let bawal = Math.floor(Math.random() * 10)
        let udang = Math.floor(Math.random() * 39)
        let paus = Math.floor(Math.random() * 2)
        let kepiting = Math.floor(Math.random() * 27)
        let totalCatch = nila + bawal + ikan + lele + udang + paus + kepiting

        let arr = [
          'pergi mancing🎣',
          'tunggu sampai ikan makan umpan',
          'umpan di makan ikan!!, kamu tarik pancing nya!',
          `• *Hasil Mancing:* \n◦ 🐟 Ikan nila: ${nila} \n◦ 🐡 Bawal: ${bawal} \n◦ 🐟 Lele: ${lele} \n◦ 🐟 Ikan: ${ikan} \n◦ 🦐 Udang: ${udang} \n◦ 🐋 Paus: ${paus} \n◦ 🦀 Kepiting: ${kepiting}`,
        ]

        let { key } = await conn.sendMessage(m.chat, { text: arr[0] }, { quoted: m })
        for (let i = 1; i < arr.length - 1; i++) {
          await new Promise(resolve => setTimeout(resolve, 8000))
          await conn.sendMessage(m.chat, { text: arr[i], edit: key })
        }
        await new Promise(resolve => setTimeout(resolve, 8000))
        await conn.sendMessage(m.chat, { text: arr[arr.length - 1], edit: key })

        user.nila += nila
        user.ikan += ikan
        user.lele += lele
        user.bawal += bawal
        user.udang += udang
        user.paus += paus
        user.kepiting += kepiting
        user.lastmancing = Date.now()
        user.fishingrod -= 1
        user.totalPancingan += totalCatch
      } else {
        let remainingTimeStr = formatTime(remainingTime)
        conn.reply(m.chat, `kamu baru mancing, tunggu selama ${remainingTimeStr}`, m)
      }
    } else {
      conn.reply(m.chat, '[❗] kamu gak punya pancingan\n bikin dulu di ```!craft``` 🎣', m)
    }
  } catch (e) {
    console.error(e)
    conn.reply(m.chat, 'Terjadi kesalahan, silakan coba lagi nanti.', m)
  }
}

handler.help = ['mancing']
handler.tags = ['rpg']
handler.command = /^(mancing|memancing)$/i

module.exports = handler

function formatTime(ms) {
  let seconds = Math.floor(ms / 1000)
  let minutes = Math.floor(seconds / 60)
  let hours = Math.floor(minutes / 60)
  seconds %= 60
  minutes %= 60
  hours %= 24
  let hStr = hours.toString().padStart(2, '0')
  let mStr = minutes.toString().padStart(2, '0')
  let sStr = seconds.toString().padStart(2, '0')
  return `${hStr}:${mStr}:${sStr}`
}