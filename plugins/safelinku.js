let fetch = require('node-fetch')

// pakai CraXID Scraper API, bukan langsung ke safelinku.com
const API_BASE = process.env.RESAPI_URL || 'https://api.hxa.my.id'

let handler = async (m, { text, usedPrefix, command }) => {
  if (!text) throw `Linknya mana?\n> ${usedPrefix + command} https://google.com`

  let [url, alias] = text.trim().split(/\s+/)

  // validasi url biar gak dilempar mentah ke API
  try {
    let u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) throw 0
  } catch (e) {
    throw 'Itu bukan URL yang valid.\nContoh: ' + usedPrefix + command + ' https://google.com'
  }

  let apiUrl = `${API_BASE}/api/shortlink/safelinku?url=${encodeURIComponent(url)}`
  if (alias) apiUrl += `&alias=${encodeURIComponent(alias)}`

  let res = await fetch(apiUrl)
  let json = await res.json()

  if (!json.status) throw json.message || 'Gagal bikin shortlink, coba lagi nanti.'

  m.reply(`🔗 *SafelinkU*\n\n${url}\n⬇\n${json.data.short}` + (alias ? `\n\nAlias: ${alias}` : ''))
}

handler.help = ['safelinku <link> [alias]']
handler.tags = ['shortlink']
handler.command = /^safelinku$/i

module.exports = handler
