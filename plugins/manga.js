const fetch = require('node-fetch')

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) throw `✳️ Manga Information\n\nExample: ${usedPrefix + command} Bocchi the Rock`

  // 🌟 Base URL for Jikan API
  const baseURL = 'https://api.tenrai.org/v1/manga';

  try {
    // 1. First fetch: Search for manga/novel details
    const res = await fetch(`${baseURL}?q=${encodeURIComponent(text)}&limit=1`)
    const result = await res.json()

    if (!result.data || result.data.length === 0) throw 'Manga not found';

    const mangaData = result.data[0];
    const mal_id = mangaData.mal_id;

    // 2. Second fetch: Get Characters (Since manga doesn't have Voice Actors, we only take the character names)
    let mainCharactersText = '-';
    try {
        const charReq = await fetch(`${baseURL}/${mal_id}/characters`);
        const charRes = await charReq.json();
        
        if (charRes.data) {
            // Filter only "Main" characters
            let mainChars = charRes.data
                .filter(c => c.role === 'Main')
                .map(c => `• ${c.character.name}`);

            // Limit to 5 characters to avoid spam
            mainCharactersText = mainChars.length > 0 ? mainChars.slice(0, 5).join('\n') : '-';
        }
    } catch (e) {
        console.error('Failed to fetch character data:', e);
    }

    // Safely extract arrays (Genres, Themes, Authors, Serializations)
    const authors = mangaData.authors ? mangaData.authors.map(a => a.name).join(', ') : '-';
    const genres = mangaData.genres ? mangaData.genres.map(g => g.name).join(', ') : '-';
    const themes = mangaData.themes ? mangaData.themes.map(t => t.name).join(', ') : '-';
    const serializations = mangaData.serializations ? mangaData.serializations.map(s => s.name).join(', ') : '-';
    
    // Safely extract Alternative Titles
    const synonyms = mangaData.titles.filter(t => t.type === 'Synonym').map(t => t.title).join(', ') || '-';
    const titleEn = mangaData.title_english || (mangaData.titles.find(t => t.type === 'English') || {}).title || '-';
    const titleJa = mangaData.title_japanese || (mangaData.titles.find(t => t.type === 'Japanese') || {}).title || '-';

    // Optional Background text block
    const backgroundText = mangaData.background ? `\n*Background:*\n${mangaData.background}\n` : '';

    // 3. Wrap text with Template Literals
    let caption = `
*Title:* ${titleJa}
*Romaji:* ${mangaData.title || '-'}
*Title (English):* ${titleEn}
*Synonyms:* ${synonyms}
*Authors:* ${authors}
*Serializations:* ${serializations}
*Genres:* ${genres}
*Themes:* ${themes}

*Type:* ${mangaData.type || '-'}
*Status:* ${mangaData.status || '-'}
*Volumes:* ${mangaData.volumes || 'Unknown'}
*Chapters:* ${mangaData.chapters || 'Unknown'}
*Published:* ${mangaData.published?.string || '-'}

*Score:* ${mangaData.score || '-'} (${mangaData.scored_by || '0'})
*Rank:* ${mangaData.rank || '-'}
*Popularity:* ${mangaData.popularity || '-'}
*Favorites:* ${mangaData.favorites || '0'}
*MAL ID:* ${mangaData.mal_id}
*MAL Link:* ${mangaData.url}

*👤 Main Characters:*
${mainCharactersText}

*Total Results:* ${result.pagination.items.total}
*Current Page:* ${result.pagination.current_page}

*Synopsis:* 
${mangaData.synopsis || '-'}
${backgroundText}`.trim()

    await conn.sendFile(m.chat, mangaData.images.jpg.large_image_url, 'manga.png', caption, m)

  } catch (err) {
    console.error(err)
    throw (`*ERROR:* Oops, the *${command}* you are looking for was not found, or maybe you made a typo :(`)
  }
}

handler.help = ['manga'].map(v => v + ' <name>')
handler.tags = ['tools', 'premium', 'internet']
handler.command = ['manga', 'manhwa', 'novel', 'ln', 'lightnovel']
handler.premium = false
handler.register = true
handler.limit = true

module.exports = handler