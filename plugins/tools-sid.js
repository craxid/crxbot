let fetch = require('node-fetch')

// API resmi s.id (dash.s.id), key dibuat di Dashboard -> Developer -> API Keys
// diisi di config.js: global.sid

let handler = async (m, { text, usedPrefix, command }) => {
  if (!global.sid) throw 'API key s.id belum diisi di config.js'
  if (!text) throw `Linknya mana?\n> ${usedPrefix + command} https://google.com`

  let [url, slug] = text.trim().split(/\s+/)

  try {
    let u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) throw 0
  } catch (e) {
    throw 'Itu bukan URL yang valid.\nContoh: ' + usedPrefix + command + ' https://google.com'
  }

  let body = { long_url: url }
  if (slug) body.custom_slug = slug

  let res = await fetch('https://api.s.id/v2/links', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + global.sid,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (res.status === 401) throw 'API key s.id ditolak, cek lagi key-nya di config.js.'
  if (res.status === 403) throw 'API key s.id kurang scope links:write.'
  if (res.status === 429) throw 'Kena rate limit s.id (38/menit), coba lagi nanti.'
  if (!res.ok) throw 'Gagal bikin shortlink s.id, coba lagi nanti.'

  let json = await res.json()
  let short = json.data && json.data.short_url
  if (!short) throw 'Respons s.id aneh, shortlink-nya gak ketemu.'

  m.reply(`🔗 *s.id*\n\n${url}\n⬇\n${short}` + (slug ? `\n\nSlug: ${slug}` : ''))
}

handler.help = ['sid <link> [slug]']
handler.tags = ['shortlink']
handler.command = /^sid$/i

module.exports = handler
