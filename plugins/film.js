const fetch = require('node-fetch')

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `✳️ Movie Information\n\nExample: ${usedPrefix + command} The Avengers`
  
  const headers = {
    'accept': 'application/json',
    'Authorization': `Bearer ${global.tmdb}`
  }

  try {
    // 1. Cari Film
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(text)}&include_adult=true&language=en-US`
    const searchRes = await fetch(searchUrl, { method: 'GET', headers })
    const searchData = await searchRes.json()

    // Langsung ambil hasil paling atas tanpa filter apapun
    if (!searchData.results || searchData.results.length === 0) {
      throw `Oops, no results found for "${text}".`
    }
    const film = searchData.results[0]

    // 2. Fetch Detail & Credits secara paralel agar lebih cepat
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${film.id}?language=en-US`, { headers }),
      fetch(`https://api.themoviedb.org/3/movie/${film.id}/credits?language=en-US`, { headers })
    ])
    
    const data = await detailRes.json()
    const credits = await creditsRes.json()

    // Processing Data
    const genres = data.genres ? data.genres.map(g => g.name).join(', ') : '-'
    const production = data.production_companies ? data.production_companies.map(p => p.name).join(', ') : '-'
    const director = credits.crew.find(c => c.job === 'Director')?.name || 'Unknown'
    const producers = credits.crew.filter(c => c.job === 'Producer').map(c => c.name).slice(0, 3).join(', ') || 'Unknown'
    const cast = credits.cast && credits.cast.length > 0 ? credits.cast.slice(0, 5).map(c => `${c.name} (as ${c.character})`).join('\n') : 'Unknown'
    
    const budget = data.budget > 0 ? `$${data.budget.toLocaleString()}` : '-'
    const revenue = data.revenue > 0 ? `$${data.revenue.toLocaleString()}` : '-'
    
    // Ubah format durasi dari 'j' (jam) menjadi 'h' (hours)
    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : '-'
    
    // Rangkai URL IMDb
    const play = data.imdb_id ? `https://playimdb.com/title/${data.imdb_id}/` : 'Unknown'

    const detil = `
*🎬 ${data.title} (${data.release_date ? data.release_date.split('-')[0] : 'N/A'})*
*Tagline:* ${data.tagline || 'Unknown'}
*Status:* ${data.status}
*Genres:* ${genres}
*Duration:* ${runtime}

*Rating:* ${data.vote_average.toFixed(1)} (${data.vote_count} votes)
*Popularity:* ${data.popularity}
*Budget:* ${budget}
*Revenue:* ${revenue}

*Director:* ${director}
*Producers:* ${producers}
*Cast (Top 5):*
${cast}

*🏢 Production:* ${production}
*🔗 Homepage:* ${data.homepage || 'Unknown'}
*🔗 Watch Full Movie:* ${play}

*📝 Synopsis:*
${data.overview || 'No synopsis available.'}`.trim()

    const poster = data.poster_path 
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}` 
      : 'https://via.placeholder.com/500x750'

    await conn.sendFile(m.chat, poster, 'movie.jpg', detil, m)
    
  } catch (err) {
    console.error(err)
    throw `*ERROR:* An error occurred while fetching data.\n\n${err}`
  }
}

handler.help = ['movie'].map(v => v + ' <title>')
handler.tags = ['internet']
handler.command = ['movie', 'film']
handler.premium = false
handler.limit = true

module.exports = handler
