// scraper kuronime (domain aktif sekarang kuronime.sbs, .moe redirect ke sini).
// situsnya wordpress tema animenonton: cari & info anime dari HTML biasa,
// tapi playernya beda cerita: halaman episode cuma bawa blob terenkripsi
// (_0xa100d42aa) yang dikirim ke api animeku buat ditukar payload sumber
// video, dan payload balasannya (mirror/src) masih terenkripsi AES format
// CryptoJS. passphrase-nya hasil bongkar pintar.js punya situsnya sendiri.
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const BASE = 'https://kuronime.sbs';
const API_SOURCES = 'https://animeku.org/api/v9/sources';
const PASSPHRASE = '3&!Z0M,VIZ;dZW==';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const headers = { 'User-Agent': UA, Referer: BASE + '/' };

async function ambilHtml(url) {
    const { data } = await axios.get(url, { headers, timeout: 30000 });
    return data;
}

// --- dekripsi format CryptoJS (payload {ct, iv, s}) pakai crypto bawaan node ---
function evpKdf(pass, salt, keyLen) {
    let derived = Buffer.alloc(0);
    let block = Buffer.alloc(0);
    const passBuf = Buffer.from(pass, 'utf8');
    while (derived.length < keyLen) {
        block = crypto.createHash('md5').update(Buffer.concat([block, passBuf, salt])).digest();
        derived = Buffer.concat([derived, block]);
    }
    return derived.subarray(0, keyLen);
}

function dekripPayload(jsonStr) {
    const { ct, iv, s } = JSON.parse(jsonStr);
    const key = evpKdf(PASSPHRASE, Buffer.from(s, 'hex'), 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    const out = Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]);
    return JSON.parse(out.toString('utf8'));
}

// "v1080p" -> "1080p"
const kualitas = (k) => k.replace(/^v/i, '');

async function search(query) {
    try {
        const html = await ambilHtml(`${BASE}/?s=${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);
        const results = [];
        $('article.bs .bsx').each((i, el) => {
            const a = $(el).find('a').first();
            const link = a.attr('href');
            if (!link || !link.includes('/anime/')) return;
            results.push({
                title: a.attr('title') || $(el).find('.tt h2').text().trim(),
                link,
                thumbnail: $(el).find('img[itemprop="image"]').attr('src') || '',
                type: $(el).find('.bt .type').text().trim(),
                rating: $(el).find('.rating i').text().trim()
            });
        });
        return results;
    } catch (error) {
        console.error('Error searching kuronime:', error.message);
        return [];
    }
}

async function detail(url) {
    try {
        const html = await ambilHtml(url);
        const $ = cheerio.load(html);

        const title = $('h1.entry-title').first().text().trim();
        const thumbnail = $('meta[property="og:image"]').attr('content') || '';
        const score = $('[itemprop="ratingValue"]').attr('content') || '';

        // info anime bentuknya daftar <li><b>Label</b>: nilai</li>,
        // patokannya daftar yang memuat item "Jumlah Episode"
        let infoLis = null;
        $('li').each((i, el) => {
            if ($(el).find('> b').length && /Jumlah Episode/.test($(el).text())) infoLis = $(el).parent();
        });
        const info = {};
        if (infoLis) {
            infoLis.find('> li').each((i, el) => {
                const bEl = $(el).find('> b').first();
                const key = bEl.text().replace(/:$/, '').trim();
                if (!key) return;
                info[key] = $(el).text().replace(bEl.text(), '').replace(/^[:\s]+/, '').trim();
            });
        }

        // versi rapinya info, pola sama kayak detail di otakudesu
        const detail = {
            judul: info['Judul'] || title,
            skor: score,
            status: info['Status'] || '',
            studio: info['Studio'] || '',
            tayang: info['Tayang'] || '',
            season: info['Season'] || '',
            tipe: info['Tipe'] || '',
            durasi: info['Durasi'] || '',
            totalEpisode: info['Jumlah Episode'] || '',
            genre: info['Genre'] ? info['Genre'].split(',').map(g => g.trim()).filter(Boolean) : []
        };

        const paragraf = [];
        $('.conx p').each((i, el) => {
            const t = $(el).text().trim();
            if (t.length > 40) paragraf.push(t);
        });
        const synopsis = paragraf.join('\n\n');

        // daftar episode apa adanya dari situsnya (urutan terbaru dulu)
        const episodes = [];
        $('.bixbox.bxcl ul li').each((i, el) => {
            const a = $(el).find('.lchx a').first();
            if (a.length && a.attr('href')) episodes.push({ title: a.text().trim(), link: a.attr('href') });
        });

        if (!title && !episodes.length) return null;
        return { title, thumbnail, info, detail, synopsis, episodes };
    } catch (error) {
        console.error('Error scraping anime page:', error.message);
        return null;
    }
}

// tukar blob episode ke api animeku, balikin stream m3u8 punya player
// kuronime sendiri (paling enak buat dikirim sebagai video) + semua
// mirror embed & link download per kualitas dari payload mirror.
async function episode(url) {
    const html = await ambilHtml(url);
    const $ = cheerio.load(html);
    const title = $('h1.entry-title').first().text().trim() || $('title').text().trim();

    const ketemu = html.match(/var _0xa100d42aa = "([^"]+)"/);
    if (!ketemu) throw new Error('Blob sumber video tidak ditemukan di halaman episode');
    const blob = ketemu[1];

    const { data } = await axios.post(API_SOURCES, { id: blob }, {
        headers: { ...headers, 'Content-Type': 'application/json', Origin: BASE },
        timeout: 45000
    });
    if (!data || data.status !== 200) throw new Error('API sumber video menolak permintaan');

    const hasil = { title, url, token: data.token || '', streams: [], mirrors: [], downloads: [] };

    // player bawaan: src = kualitas tinggi, src_sd = yang lebih rendah.
    // kualitas dibaca dari url m3u8-nya langsung (…/1080p/index.m3u8).
    // catatan: m3u8 ini diekstrak apa adanya dari payload; di-fetch langsung
    // dari server per 22 Okt masih 404 (player situsnya SPA + token sesi),
    // jadi jalur kirim video andalannya tetap mirror/download di bawah.
    for (const [kunci, nama] of [['src', 'Kuronime HD'], ['src_sd', 'Kuronime SD']]) {
        if (!data[kunci]) continue;
        try {
            const d = dekripPayload(Buffer.from(data[kunci], 'base64').toString('utf8'));
            if (d && d.src) {
                const q = (d.src.match(/\/(\d{3,4}p)\//) || [])[1] || '';
                hasil.streams.push({ quality: q, server: nama, url: d.src });
            }
        } catch (e) { /* varian ini kosong, lanjut */ }
    }

    if (data.mirror) {
        const mirror = dekripPayload(Buffer.from(data.mirror, 'base64').toString('utf8'));
        for (const [kq, perHost] of Object.entries(mirror.embed || {})) {
            for (const [host, link] of Object.entries(perHost || {})) {
                if (link) hasil.mirrors.push({ quality: kualitas(kq), server: host, url: link });
            }
        }
        for (const [kq, perHost] of Object.entries(mirror.download || {})) {
            const links = [];
            for (const [host, link] of Object.entries(perHost || {})) {
                if (link) links.push({ provider: host, url: link });
            }
            if (links.length) hasil.downloads.push({ resolution: kualitas(kq), links });
        }
    }

    return hasil;
}

// --- bagian kirim video: resolve mirror jadi file, terus unduh ---

const fs = require('fs');
const { execFile } = require('child_process');

// unpacker script packer (dean edwards) yg dipakai player vidhide/filelions
function unpackPacker(p, a, c, k) {
    return p.replace(/\b\w+\b/g, (w) => {
        const idx = parseInt(w, a);
        return (idx < c && k[idx]) ? k[idx] : w;
    });
}

// ubah satu mirror embed jadi url file langsung.
// doodstream sengaja ga di-resolve: dari server selalu kena cloudflare,
// persis temuan di nekopoi dulu. gofile folder orang juga diskip,
// token di config cuma bisa baca isi akun sendiri.
async function resolveMirror(mirror) {
    const embed = mirror.url;
    if (mirror.server === 'pixeldrain') {
        const id = (embed.match(/\/u\/([A-Za-z0-9]+)/) || [])[1];
        if (!id) throw new Error('ID pixeldrain tidak ditemukan');
        return { kind: 'mp4', url: `https://pixeldrain.com/api/file/${id}` };
    }
    if (mirror.server === 'mp4upload') {
        const { data: html } = await axios.get(embed, { headers: { ...headers, Referer: BASE + '/' }, timeout: 25000 });
        if (/File was deleted/i.test(String(html))) throw new Error('File di mp4upload sudah dihapus');
        const m = String(html).match(/https:\/\/[a-z0-9]+\.mp4upload\.com:\d+\/d\/[^"]+\.mp4/) || String(html).match(/src:\s*"(https:[^"]+\.mp4)"/);
        if (!m) throw new Error('Sumber video mp4upload tidak ditemukan');
        return { kind: 'mp4', url: m[1] || m[0] };
    }
    if (mirror.server === 'filelions') {
        const { data: html } = await axios.get(embed, { headers: { ...headers, Referer: BASE + '/' }, timeout: 25000 });
        const pm = String(html).match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)\)\)/);
        if (!pm) throw new Error('Script player filelions tidak ditemukan');
        const terbuka = unpackPacker(pm[1].replace(/\\'/g, "'"), parseInt(pm[2]), parseInt(pm[3]), pm[4].split('|'));
        const m3 = terbuka.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (!m3) throw new Error('Stream filelions tidak ditemukan');
        return { kind: 'hls', url: m3[0], referer: embed };
    }
    throw new Error(`Server ${mirror.server} belum bisa di-resolve dari server`);
}

// tanya ukuran file tanpa mengunduh, buat skip kandidat yg jelas kegedean
async function ukurFile(url) {
    try {
        const r = await axios.head(url, { headers: { 'User-Agent': UA }, timeout: 15000, maxRedirects: 5 });
        const len = parseInt(r.headers['content-length'] || 0);
        if (len) return len;
    } catch {}
    try {
        const r = await axios.get(url, { headers: { 'User-Agent': UA, 'Range': 'bytes=0-0' }, responseType: 'stream', timeout: 15000, maxRedirects: 5 });
        r.data.destroy();
        const cr = r.headers['content-range'];
        if (cr) return parseInt(cr.split('/')[1]) || 0;
        return parseInt(r.headers['content-length'] || 0);
    } catch {}
    return 0;
}

// unduh mp4 per potongan pake Range (10MB per tarikan), pola sama kayak
// otakudesu: GET polos ke CDN video sering dilambatin parah.
// potongannya LANGSUNG ditulis ke disk per potongan, jangan ditampung
// di memori: RAM VPS ini kecil, nampung file ratusan MB di RAM bikin
// proses kena OOM (kejadian 22 Okt, bot kerasa gagal/restart terus).
async function unduhMp4(url, destPath, maxBytes, referer) {
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
                headers: { 'User-Agent': UA, 'Referer': referer || BASE + '/', 'Range': `bytes=${pos}-${pos + CHUNK - 1}` },
                timeout: 120000,
                maxRedirects: 5,
                validateStatus: s => s === 200 || s === 206
            });
            const cr = res.headers['content-range'];
            if (cr) fileSize = parseInt((cr.split('/')[1] || '').trim()) || fileSize;
            const buf = Buffer.from(res.data);
            if (res.status === 200) {
                // servernya cuek sama Range, dia kirim file utuh sekaligus
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

// remux hls (m3u8) jadi mp4 pake ffmpeg -c copy, pola sama kayak nekopoi
function unduhHls(url, destPath, maxBytes, referer) {
    return new Promise((resolve, reject) => {
        const args = ['-y', '-headers', `Referer: ${referer || BASE + '/'}\r\nUser-Agent: ${UA}`,
            '-i', url, '-c', 'copy', '-movflags', '+faststart', destPath];
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

// coba semua mirror satu2 sampai ada yg berhasil diunduh.
// kualitas diutamakan 480p (paling masuk akal buat WA), server yg
// file-nya langsung didahulukan.
async function downloadVideo(detail, destPath, opts = {}) {
    const maxBytes = opts.maxBytes || 100 * 1024 * 1024;
    const skorServer = (nama) => ({ pixeldrain: 0, mp4upload: 1, filelions: 2, krakenfiles: 3, doodstream: 4 }[nama] ?? 5);
    const skorKualitas = (q) => ({ '480p': 0, '360p': 1, '720p': 2, '1080p': 3 }[q] ?? 4);

    const kandidat = (detail.mirrors || [])
        .map(mm => ({ label: `${mm.server} ${mm.quality}`, mirror: mm, skor: skorServer(mm.server) * 10 + skorKualitas(mm.quality) }))
        .sort((a, b) => a.skor - b.skor);
    if (!kandidat.length) throw new Error('Tidak ada server streaming yang bisa dicoba');

    let lastErr = null;
    for (const c of kandidat) {
        try {
            const r = await resolveMirror(c.mirror);
            let size;
            if (r.kind === 'hls') {
                size = await unduhHls(r.url, destPath, maxBytes, r.referer);
            } else {
                const sz = await ukurFile(r.url);
                if (sz && sz > maxBytes) throw new Error(`Ukuran video ${(sz / 1048576).toFixed(0)} MB, melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
                size = await unduhMp4(r.url, destPath, maxBytes, c.mirror.url);
            }
            return { path: destPath, size, server: c.label, kind: r.kind };
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('Semua server streaming gagal');
}

module.exports = { search, detail, episode, downloadVideo };
