const fetch = require('node-fetch')

// Bikin Cache sederhana untuk nyimpen hasil pencarian
// Ini yang bakal nyelamatin bot lu dari spam limit API!
const animeCache = new Map()

// Fungsi delay 
const delay = time => new Promise(res => setTimeout(res, time))

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) throw `✳️ Anime Information\n\nExample: ${usedPrefix + command} Kusuriya no Hitorigoto`
  
  const queryKey = text.toLowerCase().trim()

  // 1. CEK CACHE: Kalau udah pernah dicari, langsung ambil dari memori (0 Fetch Request!)
  if (animeCache.has(queryKey)) {
    const cachedData = animeCache.get(queryKey)
    return await conn.sendFile(m.chat, cachedData.img, 'gambar.png', cachedData.caption, m)
  }

  // Base URL dari Tenrai API versi 1
  const baseURL = 'https://api.tenrai.org/v1/anime'; 

  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    // 2. Fetch Utama: Cari anime
    const searchReq = await fetch(`${baseURL}?q=${encodeURIComponent(text)}&limit=1`)
    const searchResult = await searchReq.json()
    
    if (!searchResult.data || searchResult.data.length === 0) throw 'Anime not found';
    
    const mal_id = searchResult.data[0].mal_id;

    // Tenrai API mengizinkan 4 Requests Per Second (RPS) untuk akses publik.
    // Beri jeda kecil agar 3 request paralel di bawah ini tidak terkena rate limit 429.
    await delay(300);

    // 3. Batch Request: Ambil Full Data, Staff, dan Characters
    // Di Tenrai, data Streaming & Theme sudah ada di dalam endpoint /full
    const [fullRes, staffRes, charRes] = await Promise.all([
        fetch(`${baseURL}/${mal_id}/full`).then(res => res.json()).catch(() => ({})),
        fetch(`${baseURL}/${mal_id}/staff`).then(res => res.json()).catch(() => ({})),
        fetch(`${baseURL}/${mal_id}/characters`).then(res => res.json()).catch(() => ({}))
    ]);

    // Gunakan fullRes jika berhasil didapat, atau fallback ke searchResult
    const animeData = fullRes.data || searchResult.data[0];

    // --- Ekstrak Data Staff ---
    let author = 'Unknown';
    if (staffRes.data) {
        const creatorData = staffRes.data.filter(staff =>
            staff.positions.some(pos => pos.includes('Original Creator') || pos.includes('Story & Art'))
        );
        if (creatorData.length > 0) author = creatorData.map(c => c.person.name).join(', ');
    }

    // --- Ekstrak Data Characters ---
    let mainCastText = '-';
    let supportCastText = '-';
    if (charRes.data) {
        let mainCast = [], supportCast = [];
        for (let charData of charRes.data) {
            const japVA = charData.voice_actors?.find(v => v.language === 'Japanese');
            const vaName = japVA ? japVA.person.name : '-';
            const textFormat = `• ${charData.character.name} (VA: ${vaName})`;
            
            if (charData.role === 'Main') mainCast.push(textFormat);
            else if (charData.role === 'Supporting') supportCast.push(textFormat);
        }
        mainCastText = mainCast.length > 0 ? mainCast.slice(0, 5).join('\n') : '-';
        supportCastText = supportCast.length > 0 ? supportCast.slice(0, 5).join('\n') : '-';
    }

    // --- Ekstrak Data Streaming (Dari Endpoint /full) ---
    let streamingText = '-';
    if (animeData.streaming?.length > 0) {
        streamingText = animeData.streaming.slice(0, 5).map(s => `• ${s.name}: ${s.url}`).join('\n');
    }

    // --- Ekstrak Data Themes (Dari Endpoint /full) ---
    let openingText = '-', endingText = '-';
    if (animeData.theme) {
        if (animeData.theme.openings?.length > 0) {
            openingText = animeData.theme.openings.slice(0, 3).map(op => `• ${op}`).join('\n');
        }
        if (animeData.theme.endings?.length > 0) {
            endingText = animeData.theme.endings.slice(0, 3).map(ed => `• ${ed}`).join('\n');
        }
    }

    // Ekstrak Basic Arrays
    const studio = animeData.studios?.map(studio => studio.name).join(', ') || '-'
    const genre = animeData.genres?.map(genre => genre.name).join(', ') || '-'
    const theme = animeData.themes?.map(theme => theme.name).join(', ') || '-'
    const producer = animeData.producers?.map(producer => producer.name).join(', ') || '-'
    const trailerText = animeData.trailer?.url ? `*Trailer:* ${animeData.trailer.url}\n` : ''

    // 4. Susun Caption
    let caption = `
*Title:* ${animeData.title_japanese || '-'}
*Romaji:* ${animeData.title || '-'}
*Title (English):* ${animeData.title_english || '-'}
*Author/Creator:* ${author}
*Studios:* ${studio}
*Producers:* ${producer}
*Themes:* ${theme}
*Genres:* ${genre}

*Rating:* ${animeData.rating || '-'}
*Type:* ${animeData.type || '-'}
*Source:* ${animeData.source || '-'}
*Total Episodes:* ${animeData.episodes || '-'}
*Status:* ${animeData.status || '-'}
*Aired:* ${animeData.aired?.string || '-'}
*Premiered:* ${animeData.season || '-'} ${animeData.year || ''}
*Broadcast:* ${animeData.broadcast?.string || '-'}
*Duration:* ${animeData.duration || '-'}

*Score:* ${animeData.score || '-'} (${animeData.scored_by || '0'})
*Popularity:* ${animeData.popularity || '-'}
*Favorites:* ${animeData.favorites || '0'}
*MAL ID:* ${animeData.mal_id}
*MAL Link:* ${animeData.url}
${trailerText}
*📡 Streaming Platforms:*
${streamingText}

*🎵 Theme Songs:*
_Opening:_
${openingText}

_Ending:_
${endingText}

*👤 Main:*
${mainCastText}

*👥 Supporting:*
${supportCastText}

*Synopsis:* 
${animeData.synopsis || '-'}
`.trim() 
    
    const imageUrl = animeData.images.jpg.large_image_url;

    // Simpan ke Cache biar pencarian berikutnya buat anime ini nggak butuh nge-fetch lagi
    // (Batasin max 100 cache biar memori ga bengkak)
    if (animeCache.size > 100) animeCache.clear();
    animeCache.set(queryKey, { img: imageUrl, caption: caption });

    await conn.sendFile(m.chat, imageUrl, 'gambar.png', caption, m)
    
  } catch (err) {
    console.error(err)
    throw (`*ERROR:* Oops, the anime you are looking for was not found, or maybe you made a typo :(\n\n${err}`)
  }
}

handler.help = ['anime'].map(v => v + ' <name>')
handler.tags = ['tools','premium','internet']
handler.command = ['anime','infoani']
handler.premium = false
handler.register = true
handler.limit = true

module.exports = handler