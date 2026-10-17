const { createHash } = require('crypto')
const PhoneNumber = require('awesome-phonenumber')
const levelling = require('../lib/levelling')
const axios = require("axios")
const fetch = require("node-fetch")

let handler = async (m, { conn, usedPrefix, command }) => {

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let who = await m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender

  if (!(who in global.db.data.users)) throw `✳️ Pengguna tidak ada di database`

  let pp = await conn.profilePictureUrl(who, 'image').catch((_) => 'https://craxid.github.io/icons/icon.png')

  let user = global.db.data.users[who]
  let { name, pasangan, limit, exp, money, bank, lastclaim, premiumTime, premium, registered, regTime, age, level, role, warn, job } = user
  let { min, xp, max } = levelling.xpRange(user.level, global.multiplier)
  
  // Identifikasi Nomor
  let jidNo = who.split('@')[0]

  // 1. Cek Owner (Daftar owner di config)
  let isOwner = global.owner.includes(jidNo)
  
  // 2. Cek Premium Manual (Daftar prems di config)
  let isPremsManual = global.prems.includes(jidNo)
  
  // 3. Cek Premium Database (Hasil Redeem)
  let isDbPremium = premium && premiumTime > Date.now()
  
  let expiredStatus
  let statusPremiumText = "Tidak"

  if (isOwner) {
    statusPremiumText = "Ya (Owner)"
    expiredStatus = '∞'
  } else if (isPremsManual) {
    statusPremiumText = "Ya"
    expiredStatus = 'Permanen'
  } else if (isDbPremium) {
    statusPremiumText = "Ya"
    expiredStatus = msToTime(premiumTime - Date.now())
  } else {
    statusPremiumText = "Tidak"
    expiredStatus = '∞'
  }

  let math = max - exp
  let kerja = job || 'Pengangguran'
  
  // Logic untuk menghitung sisa Warn (Asumsi maksimal warn = 3 jika global.maxwarn tidak ada)
  let maxWarn = global.maxwarn || 3
  let sisaWarn = maxWarn - warn

  let tanggalReg = new Date(regTime).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'Asia/Jakarta'
  })

  let str = `${global.htki} *Profil* ${global.htka}
${global.gx} *Nama:* @${jidNo} (${name})
${global.gx} *Role:* ${role}
${global.gx} *Nomor:* ${PhoneNumber('+' + jidNo).getNumber('international')}
${global.gx} *Link:* wa.me/${jidNo}
${registered ? global.gx + ' *Umur*: ' + age + ' tahun\n' : ''}${global.gx} *Profesi:* ${kerja}
${global.gx} *Uang:* Rp. ${money.toLocaleString('id-ID')},-
${global.gx} *Limit:* ${limit.toLocaleString('id-ID')}
${global.gx} *Level:* ${level.toLocaleString('id-ID')}
${global.gx} *XP:* ${exp.toLocaleString('id-ID')} (${(exp - min).toLocaleString('id-ID')}/${xp.toLocaleString('id-ID')}) [${math <= 0 ? `Siap untuk *${usedPrefix}levelup*` : `${math.toLocaleString('id-ID')} left`}]
${global.gx} *Warn:* ${warn} / ${maxWarn}
${global.gx} *Terdaftar:* ${registered ? `Ya - ${tanggalReg} WIB`: 'Tidak'}
${global.gx} *Premium:* ${statusPremiumText}
${global.gx} *Expired:* ${expiredStatus}
${global.sb}`

  let musik = `./fek.xml`

  var kontok = m.name
  var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${kontok} | lvl: ${level}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}


  setTimeout(() => {
    conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    conn.sendPresenceUpdate('recording', m.chat)
    conn.sendMessage(m.chat, {
      caption: str,
      fileName: `CraXID Bot 🤖`,
      fileLength: 2048000000000000,
      mimetype: 'application/vnd.ms-powerpoint',
      document: { url: musik },
      contextInfo: {
        expiration: 864000,
        forwardingScore: 9999,
        isForwarded: true,
        mentionedJid: [who],
      }
    }, { quoted: fkonn, m })
  }, 3000)
  
/*await conn.sendPresenceUpdate('recording', m.chat);
    await conn.sendFile(m.chat, pp, 'spec.jpg', str, m);*/

}
handler.help = ['profile']
handler.tags = ['info']
handler.command = ['profile', 'profil']

module.exports = handler

function msToTime(duration) {
  let days = Math.floor(duration / (1000 * 60 * 60 * 24))
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  
  let res = []
  if (days > 0) res.push(`${days} Hari`)
  if (hours > 0) res.push(`${hours} Jam`)
  if (minutes > 0) res.push(`${minutes} Menit`)
  
  return res.length > 0 ? res.join(', ') : 'Beberapa detik lagi'
}