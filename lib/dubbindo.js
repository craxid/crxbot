// scraper dubbindo.site, port dari provider CloudStream "DubbindoProvider"
// (repo AnimeX punya HatsuneMikuUwU). situsnya basis PlayTube/UVideo:
// tiap video itu halaman /watch/ sendiri, ga ada halaman series berisi
// episode kayak otakudesu. jadi alurnya cari -> pilih video -> unduh.
//
// beda sama versi CloudStream-nya yg streaming: di sini fokusnya
// DOWNLOADER mode link. sumber video dari <source> di halaman watch
// diambil dan di-resolve (yg s3.dubbindo.my.id ditukar dulu ke url
// presigned-nya) lewat daftarLinkDownload(), terus plugin menampilkan
// link-nya ke user. fungsi downloadVideo() tetap ada di bawah kalo
// suatu saat mau dibikin mode kirim file, tapi plugin ga memakainya.
//
// soal login: video lama (upload 2021-an, host stream.dubbindo.site)
// kebuka tanpa login. video baru kena subscribe wall, playernya kosong
// sampai akun login + subscribe channel pemilik videonya. makanya ada
// doLogin() + subscribeChannel() di bawah, persis alur provider aslinya.
// kredensialnya BACA DARI CONFIG, ga ditanam di file ini:
//   global.dubbindoUser = '...'
//   global.dubbindoPass = '...'
// kalo dua global itu kosong, plugin tetap jalan buat video publik,
// video yg kena wall bakal balik sumber kosong + penanda kenaWall.
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { execFile } = require('child_process');

const BASE = 'https://www.dubbindo.site';
const UA = 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';

const baseHeaders = { 'User-Agent': UA, Referer: BASE + '/' };

// --- sesi: cookie disimpan per nama di jar sederhana ---
let cookieJar = {};
let sudahLogin = false;

function cookieHeader() {
    return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function authedHeaders(extra = {}) {
    const h = { ...baseHeaders, ...extra };
    const c = cookieHeader();
    if (c) h.Cookie = c;
    return h;
}

function simpanCookie(resp) {
    const sc = resp && resp.headers && resp.headers['set-cookie'];
    if (!sc) return;
    for (const h of [].concat(sc)) {
        const part = String(h).split(';')[0].trim();
        const eq = part.indexOf('=');
        if (eq > 0) cookieJar[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
}

async function ambil(url, opts = {}) {
    const resp = await axios.get(url, {
        headers: authedHeaders(opts.headers || {}),
        timeout: opts.timeout || 30000,
        maxRedirects: opts.maxRedirects != null ? opts.maxRedirects : 5,
        validateStatus: opts.validateStatus || (s => s >= 200 && s < 400),
        responseType: opts.responseType || 'text'
    });
    simpanCookie(resp);
    return resp;
}

async function kirimForm(url, data, extraHeaders = {}) {
    const resp = await axios.post(url, new URLSearchParams(data).toString(), {
        headers: authedHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: BASE,
            ...extraHeaders
        }),
        timeout: 30000,
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
    });
    simpanCookie(resp);
    return resp;
}

// login persis punya provider aslinya: ambil PHPSESSID dari GET /login,
// POST form, sukses kalo balikannya ngasih cookie user_id.
async function doLogin() {
    const username = global.dubbindoUser || '';
    const password = global.dubbindoPass || '';
    if (!username || !password) return false;
    try {
        await ambil(`${BASE}/login`);
        await kirimForm(`${BASE}/login`, {
            username,
            password,
            remember_device: 'on'
        }, { Referer: `${BASE}/login` });
        sudahLogin = !!cookieJar.user_id;
        return sudahLogin;
    } catch (e) {
        return false;
    }
}

async function ensureSession() {
    if (sudahLogin) return true;
    return doLogin();
}

function adaKredensial() {
    return !!(global.dubbindoUser && global.dubbindoPass);
}

// --- bersih2 teks, port dari clean()/cleanTitle() versi kotlin ---
const invisibleRegex = /[\u2063\u200B\u200C\u200D\uFEFF]/g;
const dubbingRegex = /\s*[\[(]?\s*dub(?:b(?:ing)?)?\s+indo(?:o*nesia)?\b\s*[\])]?/gi;

function clean(s) {
    return String(s || '')
        .replace(invisibleRegex, '')
        .replace(/&(?:amp;)+/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanTitle(s) {
    const base = clean(s).replace(' | UVideo', '').trim();
    const dibersihkan = base
        .replace(dubbingRegex, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[-.\s]+/, '')
        .replace(/[-.\s]+$/, '');
    return dibersihkan || base;
}

// "Judul S2 E5 ..." / "Judul Episode 12 ..." -> { season, episode }
function parseEpisodeInfo(title) {
    let m = title.match(/\bS(\d{1,2})\s*E(\d{1,4})\b/i);
    if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) };
    const season = (title.match(/\b(?:season|musim)\s*(\d{1,2})\b/i) || [])[1];
    const episode = (title.match(/\bep(?:isode|s)?\.?\s*\(?\s*(\d{1,4})\b/i) || [])[1]
        || (title.match(/\s-\s(\d{1,3})(?=\s*(?:[(\[]|$))/) || [])[1];
    if (season || episode) {
        return {
            season: season ? parseInt(season) : null,
            episode: episode ? parseInt(episode) : null
        };
    }
    if (/\b(?:eps?|episode)\b/i.test(title)) return { season: null, episode: null };
    return null;
}

function typeFromCategory(url) {
    const last = String(url || '').replace(/\/+$/, '').split('/').pop();
    return { '1': 'Movie', '3': 'TV Series', '4': 'Anime Movie', '5': 'Anime Series' }[last] || '';
}

// --- parsing kartu video di halaman search / kategori / related ---
const cardSelector = 'div.video-list, div.video-wrapper';

function parseCard($, el) {
    const $el = $(el);
    const anchor = $el.find("div.video-list-image a, div.video-thumb a, div.ra-thumb a, a[href*='/watch/']").first();
    const link = (anchor.attr('href') || $el.find('a[href]').first().attr('href') || '').trim();
    if (!link) return null;

    const rawTitle = $el.find('h4[title]').attr('title')
        || $el.find('div.video-list-title h4, div.video-title h4, div.video-title a').first().text()
        || $el.find('h4').first().text()
        || $el.find('img[alt]').attr('alt')
        || '';
    const title = cleanTitle(rawTitle);
    if (!title) return null;

    const img = $el.find('img').first();
    const thumbnail = img.attr('data-src') || img.attr('src') || '';
    return {
        title,
        link,
        thumbnail,
        duration: $el.find('.video-duration').first().text().trim(),
        views: $el.attr('data-views') || ''
    };
}

function parseCards(html) {
    const $ = cheerio.load(html);
    const hasil = [];
    const seen = new Set();
    $(cardSelector).each((i, el) => {
        const item = parseCard($, el);
        if (item && !seen.has(item.link)) {
            seen.add(item.link);
            hasil.push(item);
        }
    });
    return hasil;
}

// cari video. situsnya paging pake ?page_id=, provider aslinya ngambil
// sampai 10 halaman. halamannya diambil paralel (urutannya tetap
// dijaga) soalnya situs ini lambat, kalo sekuensial satu pencarian
// bisa makan 2 menit lebih. berhenti di halaman kosong pertama.
async function scrapeSearch(query) {
    await ensureSession();
    const pages = await Promise.all(
        Array.from({ length: 10 }, (_, i) => i + 1).map(async (page) => {
            try {
                const { data: html } = await ambil(`${BASE}/search?keyword=${encodeURIComponent(query)}&page_id=${page}`);
                return parseCards(html);
            } catch (e) {
                return [];
            }
        })
    );
    const hasil = [];
    const seen = new Set();
    for (const items of pages) {
        if (!items.length) break;
        for (const it of items) {
            if (seen.has(it.link)) continue;
            seen.add(it.link);
            hasil.push(it);
        }
    }
    return hasil;
}

// --- sumber video dari halaman watch ---
const qualityInNameRegex = /(?<![0-9])(2160|1440|1080|720|576|480|360|240)p/i;

function resolveRes(src, el) {
    const m = String(src).match(qualityInNameRegex);
    if (m) return m[1];
    const $el = el;
    const label = ($el.attr('data-quality') || $el.attr('label') || $el.attr('title') || '').trim();
    const angka = label.match(/(\d{3,4})/);
    if (angka) return angka[1];
    const low = label.toLowerCase();
    if (low === '4k' || low === 'uhd') return '2160';
    if (low === 'fhd' || low === 'full hd') return '1080';
    if (low === 'hd') return '720';
    if (low === 'sd') return '480';
    return ($el.attr('res') || '').replace(/[^0-9]/g, '');
}

function parseVideoSources($) {
    const sources = [];
    const seen = new Set();
    $('video#my-video source, video source').each((i, el) => {
        const src = ($(el).attr('src') || '').trim();
        if (!src || seen.has(src)) return;
        seen.add(src);
        sources.push({
            src,
            res: resolveRes(src, $(el)),
            type: $(el).attr('type') || 'video/mp4'
        });
    });
    return sources;
}

function isSubscribeWall($) {
    const playerArea = $('div.video-processing, div.video-player').first().text() || '';
    return /subscribe to watch/i.test(playerArea)
        || $('video#my-video source, video source').length === 0;
}

function isVideoInQueue($) {
    return $('div.pt_video_player div.video-processing').length > 0;
}

// subscribe channel pemilik video biar playernya kebuka, terus matiin
// notifnya sekalian (persis provider aslinya: subscribe + notify mute)
async function subscribeChannel($, pageUrl) {
    const channelId = $('button.btn-subscribe[data-id]').attr('data-id')
        || $('.subscribe-btn-container button[data-id]').attr('data-id')
        || (($('button[onclick*="PT_Subscribe"]').attr('onclick') || '').match(/PT_Subscribe\((\d+)/) || [])[1]
        || $('input#profile-id').attr('value')
        || '';
    if (!String(channelId).trim()) return false;

    const mainSession = ($('input.main_session').attr('value') || '').trim();
    const suffix = mainSession ? `?hash=${mainSession}` : '';
    const ajaxHeaders = { 'X-Requested-With': 'XMLHttpRequest', Referer: pageUrl };

    try {
        const resp = await kirimForm(`${BASE}/aj/subscribe${suffix}`, { user_id: String(channelId).trim() }, ajaxHeaders);
        if (resp.status < 200 || resp.status >= 300) return false;
        await kirimForm(`${BASE}/aj/user/notify${suffix}`, { user_id: String(channelId).trim() }, ajaxHeaders).catch(() => {});
        return true;
    } catch (e) {
        return false;
    }
}

// ambil sumber video dgn alur provider aslinya:
// parse -> kena wall? subscribe -> parse lagi -> masih kosong?
// buang sesi, login ulang -> parse / subscribe sekali lagi.
async function fetchVideoSources(url, $awal) {
    let $ = $awal;
    if (!$) {
        const { data: html } = await ambil(url);
        $ = cheerio.load(html);
    }
    let sources = parseVideoSources($);
    if (sources.length) return { sources, kenaWall: false };

    let kenaWall = isSubscribeWall($);
    if (kenaWall && sudahLogin) {
        await subscribeChannel($, url);
        const { data: html } = await ambil(url);
        $ = cheerio.load(html);
        sources = parseVideoSources($);
    }
    if (sources.length) return { sources, kenaWall };

    if (adaKredensial()) {
        cookieJar = {};
        sudahLogin = false;
        if (await doLogin()) {
            const { data: html } = await ambil(url);
            $ = cheerio.load(html);
            sources = parseVideoSources($);
            if (!sources.length && isSubscribeWall($)) {
                kenaWall = true;
                await subscribeChannel($, url);
                const { data: html2 } = await ambil(url);
                sources = parseVideoSources(cheerio.load(html2));
            }
        }
    }
    return { sources, kenaWall };
}

function parseTags($, title) {
    const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ignore = new Set(['bahasa indonesia', 'indonesia', 'dubbing indonesia', 'dub indonesia', 'dubbing']);
    const keywords = ($('meta[name="keywords"]').attr('content') || '')
        .split(',')
        .map(k => clean(k))
        .filter(k => k && !ignore.has(k.toLowerCase()));
    const titleKey = key(title);
    const first = keywords.length ? key(keywords[0]) : '';
    const dropFirst = first && (titleKey.includes(first) || first.includes(titleKey));
    return [...new Set(dropFirst ? keywords.slice(1) : keywords)];
}

function parsePlot($, selector) {
    const el = $(selector).first().clone();
    if (!el.length) return '';
    el.find('a').remove();
    return clean(el.text()).replace(/\s*download\s*:?\s*$/i, '').trim();
}

// ambil detail satu halaman watch: judul, poster, sinopsis, tag,
// info episode (dari judul), rekomendasi, dan sumber videonya.
async function scrapeVideo(url) {
    await ensureSession();
    const { data: html } = await ambil(url);
    const $ = cheerio.load(html);

    const title = cleanTitle(
        $('h1[itemprop="title"]').first().text()
        || $('meta[name="title"]').attr('content')
        || $('meta[property="og:title"]').attr('content')
        || $('title').text()
    );
    if (!title) return null;

    const poster = $('meta[property="og:image"]').attr('content')
        || $('video#my-video').attr('poster')
        || '';
    const tags = parseTags($, title);
    const year = (title.match(/\((\d{4})\)/) || [])[1] || '';

    const recommendations = [];
    const seenRec = new Set();
    $('div.related-video-wrapper').each((i, el) => {
        $(el).find(cardSelector).each((j, card) => {
            const item = parseCard($, card);
            if (item && !seenRec.has(item.link)) {
                seenRec.add(item.link);
                recommendations.push(item);
            }
        });
        if (!$(el).find(cardSelector).length) {
            const item = parseCard($, el);
            if (item && !seenRec.has(item.link)) {
                seenRec.add(item.link);
                recommendations.push(item);
            }
        }
    });

    // halaman artikel: isinya daftar link video eksternal, bukan player
    if (url.includes('/articles/read/')) {
        const links = [];
        $('div.read-article-text a').each((i, el) => {
            const href = ($(el).attr('href') || '').trim();
            if (href) links.push(href);
        });
        return {
            title, url, poster, tags, year,
            description: parsePlot($, 'div.read-article-description article'),
            episodeInfo: null,
            sources: [],
            articleLinks: links,
            inQueue: false,
            kenaWall: false,
            recommendations
        };
    }

    const description = parsePlot($, 'div.watch-video-description p');

    if (isVideoInQueue($)) {
        return {
            title, url, poster, tags, year, description,
            episodeInfo: parseEpisodeInfo(title),
            sources: [], articleLinks: [],
            inQueue: true, kenaWall: false, recommendations
        };
    }

    const { sources, kenaWall } = await fetchVideoSources(url, $);
    return {
        title, url, poster, tags, year, description,
        episodeInfo: parseEpisodeInfo(title),
        sources, articleLinks: [],
        inQueue: false, kenaWall, recommendations
    };
}

// --- bagian downloader ---

function isPresignedS3(url) {
    return /X-Amz-Signature/i.test(url) || /X-Amz-Credential/i.test(url)
        || /wasabisys\.com/i.test(url) || /amazonaws\.com/i.test(url);
}

// src s3.dubbindo.my.id bukan file langsung: GET tanpa ngikutin redirect
// pake sesi login, lokasi balasannya itu url presigned yg beneran.
async function resolveVideoUrl(src) {
    if (isPresignedS3(src) || !src.includes('s3.dubbindo.my.id')) return src;
    try {
        const resp = await ambil(src, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400 });
        const location = resp.headers.location || resp.headers.Location;
        return location || src;
    } catch (e) {
        return src;
    }
}

// susun daftar link download dari sumber video: yg s3.dubbindo.my.id
// ditukar dulu ke url presigned-nya, sisanya apa adanya. ini yg
// ditampilkan plugin ke user (plugin ini mode link, bukan kirim file).
async function daftarLinkDownload(video) {
    const links = [];
    for (const s of video.sources || []) {
        links.push({ res: s.res || '', type: s.type || '', url: await resolveVideoUrl(s.src) });
    }
    return links;
}

// tanya ukuran file tanpa mengunduh, buat skip kandidat yg jelas kegedean
async function ukurFile(url, headers) {
    try {
        const r = await axios.head(url, { headers, timeout: 15000, maxRedirects: 5 });
        const len = parseInt(r.headers['content-length'] || 0);
        if (len) return len;
    } catch {}
    try {
        const r = await axios.get(url, {
            headers: { ...headers, Range: 'bytes=0-0' },
            responseType: 'stream', timeout: 15000, maxRedirects: 5
        });
        r.data.destroy();
        const cr = r.headers['content-range'];
        if (cr) return parseInt(cr.split('/')[1]) || 0;
        return parseInt(r.headers['content-length'] || 0);
    } catch {}
    return 0;
}

// unduh mp4 per potongan pake Range (10MB per tarikan), LANGSUNG ditulis
// ke disk per potongan. jangan ditampung di RAM: RAM VPS kecil, file
// ratusan MB di memori = OOM (pelajaran dari kuronime).
async function unduhMp4(url, destPath, maxBytes, headers) {
    const CHUNK = 10 * 1024 * 1024;
    const ws = fs.createWriteStream(destPath);
    const tulis = (buf) => new Promise((resolve, reject) => {
        ws.write(buf, (err) => err ? reject(err) : resolve());
    });
    let pos = 0;
    let fileSize = 0;
    try {
        while (true) {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { ...headers, Range: `bytes=${pos}-${pos + CHUNK - 1}` },
                timeout: 120000,
                maxRedirects: 5,
                validateStatus: s => s === 200 || s === 206
            });
            const cr = res.headers['content-range'];
            if (cr) fileSize = parseInt((cr.split('/')[1] || '').trim()) || fileSize;
            const buf = Buffer.from(res.data);
            if (res.status === 200) {
                // server cuek sama Range, dikirim utuh sekaligus
                if (pos > 0) throw new Error('Server memutus unduhan di tengah jalan');
                if (buf.length > maxBytes) throw new Error(`Ukuran video melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
                await tulis(buf);
                pos = buf.length;
                break;
            }
            if (!buf.length) break;
            pos += buf.length;
            if (pos > maxBytes) throw new Error(`Ukuran video melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
            await tulis(buf);
            if (fileSize && pos >= fileSize) break;
            if (!fileSize && buf.length < CHUNK) break;
        }
        await new Promise((resolve, reject) => { ws.once('error', reject); ws.end(() => resolve()); });
        return pos;
    } catch (e) {
        ws.destroy();
        try { fs.unlinkSync(destPath); } catch {}
        throw e;
    }
}

// remux hls (m3u8) jadi mp4 pake ffmpeg -c copy, pola sama kayak nekopoi/kuro
function unduhHls(url, destPath, maxBytes, headers) {
    return new Promise((resolve, reject) => {
        const headerStr = Object.entries(headers || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join('\r\n');
        const args = ['-y'];
        if (headerStr) args.push('-headers', headerStr + '\r\n');
        args.push('-i', url, '-c', 'copy', '-movflags', '+faststart', destPath);
        execFile('ffmpeg', args, { timeout: 10 * 60 * 1000 }, (err) => {
            if (err) return reject(new Error('Gagal mengunduh stream HLS (ffmpeg)'));
            try {
                const size = fs.statSync(destPath).size;
                if (size > maxBytes) {
                    try { fs.unlinkSync(destPath); } catch {}
                    return reject(new Error(`Ukuran video melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`));
                }
                resolve(size);
            } catch (e) { reject(e); }
        });
    });
}

// unduh video dari data scrapeVideo: coba sumber satu2, kualitas yg
// diutamakan 480 > 360 > 720 > 240 > 576 > 1080 (paling masuk akal
// buat dikirim ke WA), sampe ada yg berhasil.
async function downloadVideo(video, destPath, opts = {}) {
    const maxBytes = opts.maxBytes || 500 * 1024 * 1024;
    const skorKualitas = (res) => ({ '480': 0, '360': 1, '720': 2, '240': 3, '576': 4, '1080': 5, '1440': 6, '2160': 7 }[res] ?? 8);

    const kandidat = [...(video.sources || [])]
        .sort((a, b) => skorKualitas(a.res) - skorKualitas(b.res));
    if (!kandidat.length) throw new Error('Tidak ada sumber video yang bisa diunduh');

    let lastErr = null;
    for (const cand of kandidat) {
        try {
            const url = await resolveVideoUrl(cand.src);
            const presigned = isPresignedS3(url);
            // url presigned ga boleh dikasih cookie/header sesi, tanda
            // tangannya bisa invalid. yg lain pake sesi + referer situs.
            const headers = presigned
                ? { 'User-Agent': UA }
                : authedHeaders();
            let size;
            if (/\.m3u8($|\?)/i.test(url) || /mpegURL/i.test(cand.type || '')) {
                size = await unduhHls(url, destPath, maxBytes, headers);
            } else {
                const sz = await ukurFile(url, headers);
                if (sz && sz > maxBytes) throw new Error(`Ukuran video ${(sz / 1048576).toFixed(0)} MB, melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
                size = await unduhMp4(url, destPath, maxBytes, headers);
            }
            return { path: destPath, size, res: cand.res || '', url, kind: /\.m3u8($|\?)/i.test(url) ? 'hls' : 'mp4' };
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('Semua sumber video gagal diunduh');
}

module.exports = { scrapeSearch, scrapeVideo, daftarLinkDownload, downloadVideo, adaKredensial };
