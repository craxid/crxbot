let fetch = require('node-fetch')

// API resmi tinyurl.com, token diambil dari dashboard akun tinyurl
// diisi di config.js: global.tinyurl

let handler = async (m, { text, usedPrefix, command }) => {
  if (!global.tinyurl) throw 'API key TinyURL belum diisi di config.js'
  if (!text) throw `Linknya mana?\n> ${usedPrefix + command} https://google.com`

  let [url, alias] = text.trim().split(/\s+/)

  try {
    let u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) throw 0
  } catch (e) {
    throw 'Itu bukan URL yang valid.\nContoh: ' + usedPrefix + command + ' https://google.com'
  }

  let body = { url, domain: 'tinyurl.com' }
  if (alias) body.alias = alias

  let res = await fetch('https://api.tinyurl.com/create', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + global.tinyurl,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw 'Gagal bikin shortlink TinyURL, coba lagi nanti.'

  let json = await res.json()
  let short = json.data && json.data.tiny_url
  if (!short) throw 'Respons TinyURL aneh, shortlink-nya gak ketemu.'

  m.reply(`🔗 *TinyURL*\n\n${url}\n⬇\n${short}` + (alias ? `\n\nAlias: ${alias}` : ''))
}

handler.help = ['tinyurl <link> [alias]']
handler.tags = ['shortlink']
handler.command = /^tinyurl$/i

module.exports = handler
