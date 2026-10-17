const fetch = require('node-fetch')

// Fungsi delay untuk menjaga rate limit (4 RPS)
const delay = time => new Promise(res => setTimeout(res, time))

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const query = (text || args.join(' ')).trim()

  if (!query) {
    throw `✳️ Anime Character Information\n\nExample: ${usedPrefix + command} Maomao`
  }

  // Gunakan Base URL Tenrai API
  const baseURL = 'https://api.tenrai.org/v1/characters'

  try {
    // 1. Ambil 10 data teratas
    const searchRes = await fetch(
      `${baseURL}?q=${encodeURIComponent(query)}&limit=10`
    )

    const searchJson = await searchRes.json()

    if (!searchJson.data || !searchJson.data.length) {
      throw new Error('Character not found')
    }

    // 2. Pecah query menjadi deretan kata untuk pencocokan nama
    const queryWords = query.toLowerCase().split(/\s+/)

    // 3. Beri skor pada setiap hasil pencarian
    const scoredData = searchJson.data.map((char, index) => {
      const charNameLower = (char.name || '').toLowerCase()
      
      // Hitung berapa banyak kata dari query yang benar-benar ada di nama karakter
      const matchCount = queryWords.filter(word => charNameLower.includes(word)).length

      return {
        char,
        matchCount,
        favorites: char.favorites || 0,
        originalIndex: index
      }
    })

    // 4. Sortir dengan 3 tingkatan prioritas
    scoredData.sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount
      }
      if (b.favorites !== a.favorites) {
        return b.favorites - a.favorites
      }
      return a.originalIndex - b.originalIndex
    })

    // Ambil hasil terbaik setelah disortir
    const char = scoredData[0].char
    const malId = char.mal_id

    // Jeda 300ms untuk mencegah hit limit 4 Requests Per Second (RPS) dari Tenrai
    await delay(300)

    // 5. Full Character Info
    const fullRes = await fetch(`${baseURL}/${malId}/full`)
    const fullJson = await fullRes.json()
    const full = fullJson.data || {}

    const pagination = searchJson.pagination
      ? `*Total Results:* ${searchJson.pagination.items.total}
*Current Page:* ${searchJson.pagination.current_page}
*Last Page:* ${searchJson.pagination.last_visible_page}`
      : '-'

    const nicknames = full.nicknames?.length
      ? full.nicknames.map(v => `• ${v}`).join('\n')
      : '-'

    const animeList = full.anime?.length
      ? full.anime
          .slice(0, 10)
          .map(v => `• [${v.role}] ${v.anime.title}`)
          .join('\n')
      : '-'

    const mangaList = full.manga?.length
      ? full.manga
          .slice(0, 10)
          .map(v => `• [${v.role}] ${v.manga.title}`)
          .join('\n')
      : '-'

    const voiceActors = full.voices?.length
      ? full.voices
          .slice(0, 10)
          .map(v => `• ${v.person.name} (${v.language})`)
          .join('\n')
      : '-'

    let caption = `
*🖊️ Name:* ${char.name || '-'}
*⛩️ Native Name:* ${char.name_kanji || '-'}
*💾 MAL ID:* ${char.mal_id}
*🔗 MAL Link:* ${char.url}
*❤️ Favorites:* ${char.favorites || 0}

*🏷️ Nicknames:*
${nicknames}

*🎬 Animeography:*
${animeList}

*📚 Mangaography:*
${mangaList}

*🎙️ Voice Actors:*
${voiceActors}

*📝 Description:*
${(full.about || char.about || '-').substring(0, 3000)}

*📊 Search Info:*
${pagination}
`.trim()

    await conn.sendPresenceUpdate('composing', m.chat)

    await conn.sendFile(
      m.chat,
      char.images?.jpg?.image_url,
      'character.jpg',
      caption,
      m
    )

  } catch (err) {
    console.error(err)
    throw '*ERROR:* The character you are looking for was not found, maybe you typed it wrong.'
  }
}

handler.help = ['char <name>']
handler.tags = ['tools', 'premium', 'internet']
handler.command = ['char', 'character']
handler.premium = false
handler.limit = true

module.exports = handler