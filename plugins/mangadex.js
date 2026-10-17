// plugins/mangadex.js — REVISI
// Perubahan dari versi asli:
// 1. Bahasa divalidasi ke availableTranslatedLanguages manga; kalau bahasa yang
//    diminta tidak tersedia, bot kasih tahu bahasa apa saja yang tersedia.
// 2. Nomor chapter dinormalisasi ('01' == '1', '01.5' == '1.5').
// 3. Kalau chapter tidak ada di bahasa pilihan, bot sebutkan bahasa apa saja
//    yang punya chapter itu.
// 4. Perintah baru: mdlist (daftar volume & chapter) dan mdvol (download FULL
//    VOLUME jadi satu file ZIP, folder per chapter).
// Dependensi: sama seperti aslinya (node-fetch bawaan, adm-zip / python3 fallback).
// File ini tidak mengubah lib/mangadex.js sama sekali.

const md = require('../lib/mangadex');
const fetch = global.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

global.mangadexSearch = global.mangadexSearch || {};
const DEFAULT_LANGS = ['id', 'en', 'ja'];
const ZIP_MAX_BYTES = 100 * 1024 * 1024; // aman di bawah limit 50MB Bot API

// ---------- helper ----------

// '01' -> '1', '01.5' -> '1.5', '0' -> '0'
function normChapter(s) {
  s = String(s == null ? '' : s).trim();
  if (!/^\d*\.?\d+$/.test(s)) return s;
  const parts = s.split('.');
  const intPart = parts[0].replace(/^0+(?=\d)/, '');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

function normVolume(s) {
  s = String(s == null || s === '' ? 'none' : s).trim();
  return normChapter(s);
}

const isUuid = (t) => /^[a-f0-9-]{36}$/.test(String(t).trim());

// Bahasa yang tersedia untuk sebuah manga (dari metadata resmi MangaDex)
async function getAvailableLangs(mangaId) {
  try {
    const r = await fetch(`${md.BASE}/manga/${mangaId}`);
    const j = await r.json();
    return (j.data && j.data.attributes.availableTranslatedLanguages) || [];
  } catch { return []; }
}

// Daftar bahasa yang memiliki chapter tertentu (tanpa filter bahasa di query)
async function chapterLanguages(mangaId, chapterNum) {
  const target = normChapter(chapterNum);
  const langs = new Set();
  let offset = 0;
  try {
    while (offset <= 10000) {
      const url = `${md.BASE}/manga/${mangaId}/feed?limit=500&offset=${offset}&order%5Bchapter%5D=asc`;
      const j = await (await fetch(url)).json();
      if (j.result !== 'ok' || !j.data || !j.data.length) break;
      for (const c of j.data) {
        const a = c.attributes;
        if (a.externalUrl === null && a.pages > 0 && normChapter(a.chapter) === target) {
          langs.add(a.translatedLanguage);
        }
      }
      if (j.data.length < 500) break;
      offset += 500;
    }
  } catch { /* abaikan */ }
  return [...langs];
}

// Ambil semua chapter sebuah manga untuk SATU bahasa (dipakai mdlist & mdvol)
async function getAllChapters(mangaId, lang) {
  const out = [];
  let offset = 0;
  const enc = encodeURIComponent(lang);
  while (offset <= 20000) {
    const url = `${md.BASE}/manga/${mangaId}/feed?limit=500&offset=${offset}` +
      `&translatedLanguage%5B%5D=${enc}&order%5Bvolume%5D=asc&order%5Bchapter%5D=asc`;
    let j;
    try { j = await (await fetch(url)).json(); }
    catch { break; }
    if (j.result !== 'ok' || !j.data || !j.data.length) break;
    for (const c of j.data) {
      const a = c.attributes;
      if (a.externalUrl !== null || !(a.pages > 0)) continue;
      out.push({
        id: c.id,
        volume: normVolume(a.volume),
        chapter: normChapter(a.chapter),
        rawChapter: String(a.chapter || ''),
        title: a.title || '',
        pages: a.pages,
      });
    }
    if (j.data.length < 500) break;
    offset += 500;
  }
  return out;
}

// Kelompokkan chapter per volume, urut numerik ('none' paling bawah)
function groupByVolume(chapters) {
  const map = {};
  for (const c of chapters) {
    (map[c.volume] = map[c.volume] || []).push(c);
  }
  for (const v of Object.values(map)) {
    v.sort((a, b) => (parseFloat(a.chapter) || 0) - (parseFloat(b.chapter) || 0));
  }
  const vols = Object.keys(map).sort((a, b) => {
    if (a === 'none') return 1;
    if (b === 'none') return -1;
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  });
  return { map, vols };
}

// Unduh halaman-halaman satu chapter ke folder tujuan, return daftar file
async function downloadChapterPages(chapterId, outDir, onProgress) {
  const panels = await md.getChapterPages(chapterId);
  if (!panels || !panels.length) throw new Error('Gagal memuat halaman dari server.');
  const files = [];
  for (let i = 0; i < panels.length; i++) {
    const buf = Buffer.from(await (await fetch(panels[i])).arrayBuffer());
    const ext = panels[i].split('.').pop().split('?')[0] || 'jpg';
    const f = path.join(outDir, String(i + 1).padStart(3, '0') + '.' + ext);
    fs.writeFileSync(f, buf);
    files.push(f);
    if (onProgress && (i + 1) % 10 === 0) onProgress(i + 1, panels.length);
  }
  return files;
}

function makeZip(sourceDir, zipPath) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir);
    zip.writeZip(zipPath);
  } catch (e) {
    execSync(`python3 -c "import shutil; shutil.make_archive('${sourceDir}', 'zip', '${sourceDir}')"`);
    fs.renameSync(sourceDir + '.zip', zipPath);
  }
}

const safe = (s, n = 30) => String(s || 'manga').replace(/[^\w]/g, '_').substring(0, n);

// ---------- handler ----------

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const isDownload = ['mddl', 'mangadexdl'].includes(command);
  const isList = ['mdlist', 'mangadexlist'].includes(command);
  const isVol = ['mdvol', 'mangadexvol'].includes(command);
  const parts = text.trim().split(/\s+/);

  let target = parts[0] || '';
  let chapterArg = '1';
  let volumeArg = '';
  let langArg = '';

  if (isVol) {
    // mdvol <id/nomor> <volume> [lang]
    volumeArg = parts[1] || '';
    if (parts.length >= 3 && /^[a-zA-Z]+$/.test(parts[2])) langArg = parts[2];
  } else if (isList) {
    // mdlist <id/nomor> [lang]
    if (parts.length >= 2 && /^[a-zA-Z]+$/.test(parts[1])) langArg = parts[1];
  } else {
    // mddl/mangadex: <id/nomor> [chapter] [lang]
    if (parts.length === 2) {
      if (/^[a-zA-Z]+$/.test(parts[1])) langArg = parts[1];
      else chapterArg = parts[1];
    } else if (parts.length >= 3) {
      chapterArg = parts[1];
      langArg = parts[2];
    }
  }

  let processMsg = await conn.sendMessage(m.chat, { text: '⏳ *Memproses permintaan MangaDex...*' }, { quoted: m });
  const editLoading = async (t) => {
    if (processMsg && processMsg.key) await conn.sendMessage(m.chat, { text: t, edit: processMsg.key }).catch(() => {});
  };

  const USAGE =
    `❌ Masukkan judul, nomor hasil, atau ID!\n\n` +
    `*Format:*\n` +
    `${usedPrefix}mangadex <judul> — cari manga\n` +
    `${usedPrefix}mdlist <id/nomor> [bahasa] — daftar volume & chapter\n` +
    `${usedPrefix}mddl <id/nomor> [chapter] [bahasa] — download 1 chapter (ZIP)\n` +
    `${usedPrefix}mdvol <id/nomor> <volume> [bahasa] — download FULL VOLUME (ZIP)\n\n` +
    `*Contoh:*\n` +
    `${usedPrefix}mdlist 1 id\n` +
    `${usedPrefix}mddl 1 15 id\n` +
    `${usedPrefix}mdvol 1 3 id`;

  if (!text) return await editLoading(USAGE);

  // Nomor hasil pencarian -> UUID (sesi pencarian)
  try {
    if (/^\d+$/.test(target) && global.mangadexSearch[m.chat] && global.mangadexSearch[m.chat].length) {
      const picked = global.mangadexSearch[m.chat][parseInt(target) - 1];
      if (!picked) return await editLoading('❌ Nomor tidak valid atau sesi pencarian sudah kedaluwarsa.');
      target = picked;
    }
  } catch { /* lanjut */ }

  try {
    // ---------- metadata manga ----------
    let mangaId = target;
    let info;
    if (!isUuid(target)) {
      await editLoading(`🔍 *Mencari:* ${target}...`);
      const results = await md.searchManga(target, 10);
      if (!results.length) return await editLoading(`❌ Tidak ditemukan: *${target}*`);
      global.mangadexSearch[m.chat] = results.map(r => r.id);
      let txt = `🔍 *Hasil Pencarian MangaDex: ${target}*\n\n`;
      results.forEach((r, i) => {
        const t = r.attributes.title.en || Object.values(r.attributes.title)[0] || 'No Title';
        txt += `*${i + 1}. ${t}*\n🔖 ID: ${r.id}\n\n`;
      });
      txt += `Balas dengan *${usedPrefix}mangadex <nomor>* untuk detail\n` +
        `*${usedPrefix}mdlist <nomor> [bahasa]* — lihat daftar volume\n` +
        `*${usedPrefix}mddl <nomor> [chapter] [bahasa]* — download chapter\n` +
        `*${usedPrefix}mdvol <nomor> <volume> [bahasa]* — download full volume (ZIP).`;
      return await editLoading(txt);
    }

    await editLoading('⏳ *Mengambil metadata...*');
    const res = await fetch(`${md.BASE}/manga/${mangaId}?includes[]=cover_art&includes[]=author`);
    const json = await res.json();
    if (json.result !== 'ok') throw new Error('Manga tidak ditemukan di database server.');
    info = md.parseManga(json.data);
    const mangaTitle = info.title.en || Object.values(info.title)[0] || info.id;

    // ---------- validasi bahasa ----------
    const availableLangs = await getAvailableLangs(info.id);
    let langWarn = '';
    let langs = DEFAULT_LANGS.filter(l => availableLangs.includes(l));
    if (!langs.length) langs = availableLangs.slice(0, 3).length ? availableLangs.slice(0, 3) : DEFAULT_LANGS;
    if (langArg) {
      const l = langArg.toLowerCase();
      if (availableLangs.length && !availableLangs.includes(l)) {
        langWarn = `⚠️ Bahasa *${l}* tidak tersedia untuk manga ini.\nBahasa tersedia: *${availableLangs.join(', ')}*\n`;
      }
      langs = [l, ...DEFAULT_LANGS.filter(x => x !== l)];
    }
    const primaryLang = langs[0];

    let caption = `*📚 ${mangaTitle}*\n\n`;
    caption += `*🔖 ID:* ${info.id}\n*🎨 Author:* ${info.author || '-'}\n*📊 Status:* ${info.status}\n`;
    caption += `*🌐 Bahasa tersedia:* ${availableLangs.join(', ') || '-'}\n`;
    caption += `*🏷️ Tags:* ${info.tags.join(', ') || '-'}\n\n*📝 Sinopsis:*\n${(info.description_en || '-')}\n`;
    if (langWarn) caption = langWarn + '\n' + caption;

    const sendCover = async (cap) => {
      try {
        return await conn.sendMessage(m.chat, { image: { url: info.thumbnail }, caption: cap }, { quoted: m });
      } catch {
        return await conn.sendMessage(m.chat, { text: cap }, { quoted: m });
      }
    };

    // ---------- mdlist: daftar volume & chapter ----------
    if (isList) {
      await editLoading(`⏳ *Mengambil daftar chapter (${primaryLang.toUpperCase()})...*`);
      const chapters = await getAllChapters(info.id, primaryLang);
      if (!chapters.length) {
        const alt = availableLangs.filter(l => l !== primaryLang);
        throw new Error(
          `Tidak ada chapter bahasa *${primaryLang.toUpperCase()}* untuk manga ini.` +
          (alt.length ? `\nCoba bahasa lain: ${alt.join(', ')}\nContoh: ${usedPrefix}mdlist ${info.id} ${alt[0]}` : '')
        );
      }
      const { map, vols } = groupByVolume(chapters);
      let txt = `*📚 ${mangaTitle}*\n🌐 Bahasa: *${primaryLang.toUpperCase()}*\n📖 Total: *${chapters.length} chapter* dalam *${vols.length} volume*\n\n`;
      for (const v of vols.slice(0, 40)) {
        const list = map[v];
        const first = list[0].chapter, last = list[list.length - 1].chapter;
        const pages = list.reduce((s, c) => s + c.pages, 0);
        txt += `📗 *Vol ${v}* — ${list.length} chapter (Ch ${first}${list.length > 1 ? '–' + last : ''}, ~${pages} hlm)\n`;
      }
      if (vols.length > 40) txt += `\n_...dan ${vols.length - 40} volume lainnya._\n`;
      txt += `\n💡 Download full volume:\n*${usedPrefix}mdvol ${info.id} <volume> ${primaryLang}*\n` +
        `Contoh: *${usedPrefix}mdvol ${info.id} 1 ${primaryLang}*`;
      if (langWarn) txt = langWarn + '\n' + txt;
      await editLoading(txt);
      return;
    }

    // ---------- mdvol: download full volume jadi ZIP ----------
    if (isVol) {
      if (!volumeArg) return await editLoading(`❌ Tentukan volumenya!\nContoh: *${usedPrefix}mdvol ${info.id} 1 ${primaryLang}*`);
      const vol = normVolume(volumeArg);
      await editLoading(`⏳ *Mengambil daftar chapter Vol ${vol} (${primaryLang.toUpperCase()})...*`);
      const chapters = await getAllChapters(info.id, primaryLang);
      const { map, vols } = groupByVolume(chapters);
      const volChapters = map[vol] || [];
      if (!volChapters.length) {
        throw new Error(
          `Volume *${vol}* tidak ada dalam bahasa *${primaryLang.toUpperCase()}*.\n` +
          `Volume tersedia: ${vols.join(', ') || '-'}`
        );
      }

      await sendCover(caption + `\n📗 *Mengunduh Volume ${vol}* — ${volChapters.length} chapter, bahasa *${primaryLang.toUpperCase()}*.\n⏳ Ini bisa memakan waktu beberapa menit...`);

      const outDir = './tmp/mdvol_' + info.id + '_v' + vol + '_' + primaryLang;
      if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });

      let totalPages = 0;
      for (let ci = 0; ci < volChapters.length; ci++) {
        const ch = volChapters[ci];
        const chDir = path.join(outDir, 'Chapter_' + String(ch.chapter).padStart(3, '0'));
        fs.mkdirSync(chDir, { recursive: true });
        await editLoading(`⏳ *Vol ${vol}:* chapter ${ci + 1}/${volChapters.length} (Ch ${ch.chapter})...`);
        const files = await downloadChapterPages(ch.id, chDir, (done, all) => {
          editLoading(`⏳ *Vol ${vol}:* chapter ${ci + 1}/${volChapters.length} — ${done}/${all} hlm...`);
        });
        totalPages += files.length;
      }

      await editLoading(`🗜️ *Mengompresi Volume ${vol} (${totalPages} halaman)...*`);
      const zipPath = outDir + '.zip';
      makeZip(outDir, zipPath);

      const zipSize = fs.statSync(zipPath).size;
      if (zipSize > ZIP_MAX_BYTES) {
        fs.rmSync(outDir, { recursive: true, force: true });
        fs.unlinkSync(zipPath);
        throw new Error(
          `Volume ${vol} terlalu besar (*${(zipSize / 1048576).toFixed(1)} MB*, limit ~45 MB). ` +
          `Download per chapter saja dengan *${usedPrefix}mddl ${info.id} <chapter> ${primaryLang}*.`
        );
      }

      await conn.sendMessage(m.chat, {
        document: { url: zipPath }, mimetype: 'application/zip',
        fileName: `${safe(mangaTitle)}_Vol_${vol}_${primaryLang.toUpperCase()}.zip`,
        caption: `✅ *${mangaTitle} — Volume ${vol} (${primaryLang.toUpperCase()})*\n📖 ${volChapters.length} chapter | ${totalPages} halaman\nCredit: MangaDex`
      }, { quoted: m });

      fs.rmSync(outDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
      conn.sendMessage(m.chat, { delete: processMsg.key }).catch(() => {});
      return;
    }

    // ---------- info manga (bukan download) ----------
    if (!isDownload) {
      caption += `\n💡 *${usedPrefix}mdlist ${target}* — lihat daftar volume\n` +
        `Ketik *${usedPrefix}mddl ${target} 1 id* untuk download chapter 1 (ZIP).`;
      await sendCover(caption);
      conn.sendMessage(m.chat, { delete: processMsg.key }).catch(() => {});
      return;
    }

    // ---------- mddl: download 1 chapter (revisi) ----------
    chapterArg = normChapter(chapterArg);
    await sendCover(caption);

    const outDir = './tmp/md_' + info.id + '_ch' + chapterArg;
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    await editLoading(`⏳ *Mencari chapter ${chapterArg} (prioritas bahasa: ${langs.join(', ')})...*`);
    const selectedChapter = await md.getSpecificChapter(info.id, chapterArg, langs);

    if (!selectedChapter) {
      const haveLangs = await chapterLanguages(info.id, chapterArg);
      throw new Error(
        haveLangs.length
          ? `Chapter ${chapterArg} tidak tersedia dalam bahasa ${langs.join('/').toUpperCase()}, ` +
            `tapi tersedia dalam bahasa: *${haveLangs.join(', ').toUpperCase()}*.\n` +
            `Contoh: *${usedPrefix}mddl ${info.id} ${chapterArg} ${haveLangs[0]}*`
          : `Chapter ${chapterArg} tidak ditemukan di MangaDex (belum rilis / nomor salah). ` +
            `Cek daftar chapter dengan *${usedPrefix}mdlist ${info.id}*`
      );
    }

    const finalLang = selectedChapter.attributes.translatedLanguage;
    await editLoading(`⏳ *Mengunduh gambar Chapter ${chapterArg} (${finalLang.toUpperCase()})...*`);

    const downloaded = await downloadChapterPages(selectedChapter.id, outDir, (done, all) => {
      editLoading(`⏳ *Mengunduh Chapter ${chapterArg} (${finalLang.toUpperCase()}):* ${done}/${all} hlm...`);
    });

    await editLoading(`🗜️ *Mengompresi menjadi ZIP (${downloaded.length} halaman)...*`);
    const zipPath = outDir + '.zip';
    makeZip(outDir, zipPath);

    await conn.sendMessage(m.chat, {
      document: { url: zipPath }, mimetype: 'application/zip',
      fileName: `${safe(mangaTitle)}_Ch_${chapterArg}_${finalLang.toUpperCase()}.zip`,
      caption: `✅ *Chapter ${chapterArg} (${finalLang.toUpperCase()})* | ${downloaded.length} halaman\nCredit: MangaDex`
    }, { quoted: m });

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    conn.sendMessage(m.chat, { delete: processMsg.key }).catch(() => {});

  } catch (err) {
    console.error('MangaDex Error:', err);
    await editLoading(`❌ Error: ${err.message}`);
  }
};

handler.command = ['mangadex', 'md', 'mdex', 'mddl', 'mangadexdl', 'mdlist', 'mangadexlist', 'mdvol', 'mangadexvol'];
handler.help = [
  'mangadex <judul/id/nomor>',
  'mdlist <id/nomor> [lang]',
  'mddl <id/nomor> [chapter] [lang]',
  'mdvol <id/nomor> <volume> [lang]'
];
handler.tags = ['anime', 'downloader'];
handler.premium = false;
handler.register = true;
handler.limit = true;

module.exports = handler;
