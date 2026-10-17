let handler = async (m, { conn }) => {
  try {
    global.DATABASE.data.users[m.sender].lastngepet = global.db.data.users[m.sender].lastngepet || 0
    let Aku = Math.floor(Math.random() * 150)
    let Kamu = Math.floor(Math.random() * 20)
    let botol = global.wm
    
    let __timers = (new Date - global.db.data.users[m.sender].lastngepet)
    let _timers = (18000000 - __timers) 
    let timers = clockString(_timers)
    let user = global.db.data.users[m.sender]
    
    if (new Date - global.db.data.users[m.sender].lastngepet > 18000000) { // 5 jam
      if (Aku > Kamu) {
        user.money -= 10000000
        conn.sendMessage(m.chat, {
          image: { url: 'https://telegra.ph/file/c6c4a6946a354317fe970.jpg' },
          caption: `Kamu lengah Saat Ngepet, Dan Kamu Mines -10 juta`,
          contextInfo: { isForwarded: true, forwardingScore: 999 }
        }, { quoted: m })
        global.db.data.users[m.sender].lastngepet = new Date * 1
      } else if (Aku < Kamu) {
        user.money += 5000000
        conn.sendMessage(m.chat, {
          image: { url: 'https://telegra.ph/file/6a6a440d7f123bed78263.jpg' },
          caption: `Kamu berhasil Ngepet, Dan kamu mendapatkan 5 Juta rupiah`,
          contextInfo: { isForwarded: true, forwardingScore: 999 }
        }, { quoted: m })
        global.db.data.users[m.sender].lastngepet = new Date * 1
      } else {
        conn.sendMessage(m.chat, {
          image: { url: 'https://telegra.ph/file/d9fdd23790ab42280ca30.jpg' },
          caption: `Maaf kamu tidak mendapatkan *Duit* dan kamu tidak masuk Dunia Lain karna melarikan diri\n${botol}`,
          contextInfo: { isForwarded: true, forwardingScore: 999 }
        }, { quoted: m })
        global.db.data.users[m.sender].lastngepet = new Date * 1
      }
    } else {
      conn.sendMessage(m.chat, {
        image: { url: 'https://telegra.ph/file/295949ff5494f3038f48c.jpg' },
        caption: `Kamu sudah melakukan *ngepet*\nDan kamu harus menunggu selama agar bisa ngepet kembali ${timers}`,
        contextInfo: { isForwarded: true, forwardingScore: 999 }
      }, { quoted: m })
    }
  } catch (e) {
    throw `${e}`
  }
}

handler.help = ['ngepet']
handler.tags = ['rpg']
handler.command = /^(ngepet|ngefet)$/i
handler.premium = false
handler.group = true
handler.fail = null

module.exports = handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}