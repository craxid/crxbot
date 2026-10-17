const fetch = require('node-fetch')

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) throw `✳️ Contoh:\n*${usedPrefix + command}* 45717360`

  const bin = args[0].trim()
  const processing = await m.reply(global.wait || '⏳ Sedang mencari informasi BIN...')

  try {
    // jeda 3 detik sebelum lanjut
    await new Promise(resolve => setTimeout(resolve, 3000))

    const url = `https://lookup.binlist.net/${bin}`
    const res = await fetch(url, { headers: { 'Accept-Version': '3' } })
    if (!res.ok) throw new Error(`Gagal menghubungi API (status=${res.status})`)
    const json = await res.json()

    const caption = `💳 *BIN Lookup*\n\n` +
      `🔢 BIN: ${bin}\n` +
      `💳 Scheme: ${json.scheme || '-'}\n` +
      `📂 Type: ${json.type || '-'}\n` +
      `🏷️ Brand: ${json.brand || '-'}\n` +
      `💰 Prepaid: ${json.prepaid ? 'Ya' : 'Tidak'}\n\n` +
      `🌍 Country: ${json.country?.name || '-'} ${json.country?.emoji || ''}\n` +
      `💱 Currency: ${json.country?.currency || '-'}\n` +
      `📍 Location: lat=${json.country?.latitude}, lon=${json.country?.longitude}\n\n` +
      `🏦 Bank: ${json.bank?.name || '-'}\n` +
      `🌐 URL: ${json.bank?.url || '-'}\n` +
      `📞 Phone: ${json.bank?.phone || '-'}\n` +
      `🏙️ City: ${json.bank?.city || '-'}`

    await conn.sendMessage(m.chat, { text: caption, edit: processing.key })

  } catch (err) {
    console.error("DEBUG ERROR:", err)
    await conn.sendMessage(m.chat, { text: `❌ Terjadi kesalahan:\n${err.message}`, edit: processing.key })
  }
}

handler.help = ['bin <bin>']
handler.tags = ['tools']
handler.command = ['binchecker','bin','binlookup']
handler.premium = false
handler.register = true
handler.limit = true

module.exports = handler