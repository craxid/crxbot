// lib/mangadex.js
// MangaDex API client (public API)
// Docs: https://api.mangadex.org/docs/
// Note: Per MangaDex ToS, credit MangaDex + scanlation group, no ads.

const fetch = global.fetch || require('node-fetch');
const BASE = 'https://api.mangadex.org';

async function searchManga(title, limit = 10) {
  // Karakter [] diubah menjadi %5B%5D agar tidak ditolak oleh server API
  const url = `${BASE}/manga?title=${encodeURIComponent(title)}&limit=${limit}` +
    `&includes%5B%5D=cover_art&includes%5B%5D=author&includes%5B%5D=artist`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data || [];
}

function parseManga(manga) {                                        
  const a = manga.attributes;
  const rel = {};
  for (const r of manga.relationships || []) rel[r.type] = r;
  
  const cover = rel.cover_art?.attributes?.fileName;
  const author = rel.author?.attributes?.name || rel.artist?.attributes?.name;
  
  return {
    id: manga.id,
    title: a.title,
    alt_titles: a.altTitles,
    description_en: a.description?.en || a.description?.id || Object.values(a.description || {})[0],
    author,
    status: a.status,
    tags: (a.tags || []).map(t => t.attributes.name?.en).filter(Boolean),
    thumbnail: cover
      ? `https://uploads.mangadex.org/covers/${manga.id}/${cover}`
      : null
  };
}

/**
 * Mendapatkan ID chapter SPESIFIK dengan metode Local Filtering
 */
async function getSpecificChapter(mangaId, chapterNum = '1', langs = ['id', 'en', 'ja']) {
  const targetCh = String(chapterNum);
  let offset = 0;
  const limit = 500; // Tarik 500 chapter sekaligus (maksimal API)
  let allMatches = [];

  // Encode bracket menjadi %5B%5D agar terhindar dari 400 Bad Request
  const langParams = langs.map(l => `translatedLanguage%5B%5D=${l}`).join('&');

  // Looping jika manga memiliki lebih dari 500 chapter
  while (true) {
    const url = `${BASE}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&${langParams}&order%5Bchapter%5D=asc`;
    
    const res = await fetch(url);
    const json = await res.json();
    
    // Break jika API error atau data habis
    if (json.result !== 'ok' || !json.data || json.data.length === 0) {
      break; 
    }

    // FILTER MUTLAK JAVASCRIPT:
    // 1. Cocokkan nomor chapter
    // 2. Buang chapter eksternal (seperti MangaPlus)
    // 3. Pastikan punya halaman gambar
    const matches = json.data.filter(c => 
      c.attributes.chapter === targetCh && 
      c.attributes.externalUrl === null &&
      c.attributes.pages > 0
    );
    
    allMatches.push(...matches);

    // Jika data dari API kurang dari limit 500, berarti ini halaman terakhir
    if (json.data.length < limit) {
      break;
    }
    
    offset += limit;
  }

  if (allMatches.length === 0) {
    return null;
  }

  // Urutkan prioritas berdasarkan bahasa yang di-request user (en -> id -> ja)
  allMatches.sort((a, b) => {
    const ia = langs.indexOf(a.attributes.translatedLanguage);
    const ib = langs.indexOf(b.attributes.translatedLanguage);
    // Jika tidak ditemukan di array fallback ke 99, lalu urutkan
    return (ia > -1 ? ia : 99) - (ib > -1 ? ib : 99);
  });
  
  return allMatches[0];
}

async function getFirstChapterId(mangaId, langs = ['id', 'en', 'ja']) {
  const ch = await getSpecificChapter(mangaId, '1', langs);
  return ch ? ch.id : null;
}

async function getChapterPages(chapterId, saver = false) {
  const res = await fetch(`${BASE}/at-home/server/${chapterId}`);
  const srv = await res.json();
  const base = srv.baseUrl;
  const hash = srv.chapter.hash;
  const pages = saver ? srv.chapter.dataSaver : srv.chapter.data;
  const folder = saver ? 'data-saver' : 'data';
  return pages.map(p => `${base}/${folder}/${hash}/${p}`);
}

async function getMangaWithPanels(title, langs = ['id', 'en', 'ja']) {
  const mangas = await searchManga(title, 1);
  if (!mangas.length) throw new Error('Manga not found');
  const manga = mangas[0];
  const info = parseManga(manga);
  
  const chapter = await getSpecificChapter(info.id, '1', langs);
  if (!chapter) throw new Error('Chapter dengan bahasa ' + langs.join('/') + ' tidak ditemukan');
  
  const panels = await getChapterPages(chapter.id);
  return { ...info, chapter_id: chapter.id, panels };
}

module.exports = {
  BASE,
  searchManga,
  parseManga,
  getSpecificChapter,
  getFirstChapterId,
  getChapterPages,
  getMangaWithPanels
};