const fetch = require('node-fetch')

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const query = (text || args.join(' ')).trim()

  if (!query) {
    throw `✳️ Anime Seiyuu/People Information\n\nExample: ${usedPrefix + command} Machico`
  }

  try {
    // 1. Ambil 10 hasil teratas agar lebih akurat (daripada hanya limit 1)
    const searchRes = await fetch(
      `https://api.tenrai.org/v1/people?q=${encodeURIComponent(query)}&limit=10`
    )
    const searchJson = await searchRes.json()

    if (!searchJson.data || !searchJson.data.length) {
      throw new Error('Seiyuu not found')
    }

    // 2. Logika Ranking: Cari nama yang paling mirip dengan query
    const queryWords = query.toLowerCase().split(/\s+/)
    const scoredData = searchJson.data.map((person, index) => {
      const nameLower = (person.name || '').toLowerCase()
      const matchCount = queryWords.filter(word => nameLower.includes(word)).length
      return { person, matchCount, favorites: person.favorites || 0, index }
    })

    scoredData.sort((a, b) => (b.matchCount - a.matchCount) || (b.favorites - a.favorites))
    
    const person = scoredData[0].person
    const malId = person.mal_id

    // 3. Ambil informasi lengkap (full)
    const fullRes = await fetch(`https://api.tenrai.org/v1/people/${malId}/full`)
    const fullJson = await fullRes.json()
    const data = fullJson.data

    // 4. Format daftar karakter
    const roles = data.voices?.length
      ? data.voices
          .slice(0, 50)
          .map(v => `• *${v.character.name}* (as ${v.role}) - _${v.anime.title}_`)
          .join('\n')
      : 'No data found.'

    let caption = `
*🎙️ Seiyuu: ${data.name}*

*✨ Native Name:* ${data.name_kanji || '-'}
*🎂 Birthday:* ${data.birthday ? new Date(data.birthday).toDateString() : '-'}
*❤️ Favorites:* ${data.favorites || 0}
*🔗 MAL URL:* ${data.url}

*🎭 Top Voice Roles (Characters Played):*
${roles}

*📝 Biography/About:*
${(data.about || '-').substring(0, 500)}...
`.trim()

    await conn.sendPresenceUpdate('composing', m.chat)

    await conn.sendFile(
      m.chat,
      data.images?.jpg?.image_url,
      'seiyuu.jpg',
      caption,
      m
    )

  } catch (err) {
    console.error(err)
    throw '*ERROR:* Gagal mengambil data. Pastikan nama seiyuu benar.'
  }
}

handler.help = ['seiyuu <name>']
handler.tags = ['tools', 'internet']
handler.command = ['seiyuu', 'voiceactor','va']
handler.premium = false
handler.limit = true
handler.register = true
module.exports = handler