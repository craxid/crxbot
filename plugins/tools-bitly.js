let fetch = require('node-fetch')

// API resmi bitly.com, token diambil dari pengaturan akun bitly
// diisi di config.js: global.bitly

let handler = async (m, { text, usedPrefix, command }) => {
  if (!global.bitly) throw 'API key Bitly belum diisi di config.js'
  if (!text) throw `Linknya mana?\n> ${usedPrefix + command} https://google.com`

  let [url] = text.trim().split(/\s+/)

  try {
    let u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) throw 0
  } catch (e) {
    throw 'Itu bukan URL yang valid.\nContoh: ' + usedPrefix + command + ' https://google.com'
  }

  let res = await fetch('https://api-ssl.bitly.com/v4/shorten', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + global.bitly,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ long_url: url })
  })

  if (res.status === 403) throw 'Bitly nolak request-nya, kemungkinan tipe akunmu gak dikasih akses API.'
  if (!res.ok) throw 'Gagal bikin shortlink Bitly, coba lagi nanti.'

  let json = await res.json()
  if (!json.link) throw 'Respons Bitly aneh, shortlink-nya gak ketemu.'

  m.reply(`🔗 *Bitly*\n\n${url}\n⬇\n${json.link}`)
}

handler.help = ['bitly <link>']
handler.tags = ['shortlink']
handler.command = /^bitly$/i

module.exports = handler
