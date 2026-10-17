const fetch = require('node-fetch')

let handler = async (m, { conn, text }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
  try {
    let zenz = await fetch(`https://api.andaraz.com/user/cekapi?apikey=${global.andarazCekapi || "zenzkey_f59c1aacf2"}`)
    let zenzapi = await zenz.json()
    let wibu = await fetch('https://api.trace.moe/me')
    let wibulu = await wibu.json()

    let tegs = `
${global.htki} *API Stalker* ${global.htka}
${global.gz} *Nama pengguna:* ${zenzapi.message.username}
${global.gz} *Apikey:* *****
${global.gz} *Dibuat pada:* ${zenzapi.message.created}
${global.gz} *Diupdate:* ${zenzapi.message.updated}
${global.gz} *Hit hari ini:* ${zenzapi.message.today_hit}
${global.gz} *Total Hit:* ${zenzapi.message.total_hit}
${global.gz} *Jenis akun:* ${zenzapi.message.premium_expired === 'false / free user' ? 'Free User' : 'Premium'}
${global.sb} _What Anime API_
*ID:* ****
*Prioritas:* ${wibulu.priority}
*Per-pemakaian:* ${wibulu.concurrency}
*Kuota bulanan:* ${wibulu.quota}
*Digunakan bulan ini:* ${wibulu.quotaUsed}
`

    conn.sendMessage(m.chat, {
      text: tegs,
      contextInfo: {
        forwardingScore: 9999,
isForwarded: true,
}
    }, { quoted: fkonn })
  } catch (error) {
    console.error(error)
    m.reply(`👾 error`)
  }
}

handler.command = /^(cek(key|api))$/i
handler.rowner = true
module.exports = handler
