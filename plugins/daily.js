//import db from '../lib/database.js'

const mfree = 50000
const mprem = 2000000
const lfree = 50
const lprem = 2000

let handler = async (m, { conn, isPrems }) => {
    
  // Membuat variabel baru untuk memastikan status premium dari global.prems
  // Mengekstrak nomor pengirim tanpa '@s.whatsapp.net' dan mengeceknya di global.prems
  let isPremium = isPrems || global.prems.includes(m.sender.split('@')[0])
    
  let timedaily = global.db.data.users[m.sender].claimdaily + 86400000
  if (new Date - global.db.data.users[m.sender].claimdaily < 86400000) throw `🎁 *Kamu sudah mengambil hadiah harian*\n\n🕚 Kembalilah dalam *${msToTime(timedaily - new Date())}* `
  
  // Menggunakan isPremium sebagai pengganti isPrems bawaan parameter
  global.db.data.users[m.sender].money += isPremium ? mprem : mfree
  global.db.data.users[m.sender].limit += isPremium ? lprem : lfree
  
  await conn.sendPresenceUpdate('composing', m.chat)
  setTimeout(() => {
    m.reply(`
🎁 *DAILY REWARD*

*Kamu Mendapat:*
*Uang* : ${isPremium ? mprem : mfree}
*Limit* : ${isPremium ? lprem : lfree}
`) 
  }, 3000)
  
  global.db.data.users[m.sender].claimdaily = new Date * 1
}

handler.help = ['daily']
handler.tags = ['main']
handler.command = ['daily','claim']
handler.group = true
handler.register = true

module.exports = handler

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  seconds = (seconds < 10) ? "0" + seconds : seconds

  return hours + " Jam " + minutes + " Menit " + seconds + " Detik"
}