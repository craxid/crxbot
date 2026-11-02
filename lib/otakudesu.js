const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

// scraper otakudesu, udah digabung jadi satu file (dulu kepisah dua, otaku.js + otakudesu.js).
// isinya: cari anime, detail anime + daftar episode, sama detail episode (streaming & download).
// fetch pake bawaan node aja, ga usah node-fetch lagi.

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

const BASE = 'https://otakudesu.blog';

async function ambil(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} dari ${url}`);
    return await res.text();
}

// cari anime, balikin daftar hasil (judul, link, genre, status, rating)
async function search(query) {
    try {
        const html = await ambil(`${BASE}/?s=${encodeURIComponent(query)}&post_type=anime`);
        const $ = cheerio.load(html);

        const results = [];
        $('ul.chivsrc li').each((index, element) => {
            const title = $(element).find('h2 a').text().trim();
            const link = $(element).find('h2 a').attr('href');
            const genres = $(element).find('.set b').first().nextAll('a').map((i, el) => $(el).text()).get().join(', ');
            const status = $(element).find('.set').eq(1).text().replace('Status : ', '').trim();
            const rating = $(element).find('.set').eq(2).text().replace('Rating : ', '').trim();

            if (title && link) results.push({ title, link, genres, status, rating });
        });

        return results;
    } catch (error) {
        console.error('Error saat scraping pencarian:', error.message);
        return [];
    }
}

// detail satu anime: info, sinopsis, thumbnail, daftar episode (terbaru di atas)
async function detail(url) {
    try {
        const html = await ambil(url);
        const $ = cheerio.load(html);

        const title = $('.jdlrx h1').text().trim();
        const thumbnail = $('meta[property="og:image"]').attr('content') || $('.fotoanime img').attr('src') || '';

        const info = {};
        $('.infozingle p').each((index, element) => {
            const bText = $(element).find('b').text();
            const key = bText.replace(':', '').trim();
            const value = $(element).text().replace(bText, '').replace(/^:/, '').trim();
            if (key) info[key] = value;
        });

        const synopsis = $('.sinopc p').map((i, el) => $(el).text().trim()).get().filter(Boolean).join('\n\n');

        const episodes = [];
        $('.episodelist ul li').each((index, element) => {
            const episodeTitle = $(element).find('span').first().text().trim();
            const episodeLink = $(element).find('a').attr('href');
            const date = $(element).find('.zeebr').text().trim();
            if (episodeTitle && episodeLink) {
                episodes.push({ title: episodeTitle, link: episodeLink, date });
            }
        });

        // versi rapinya info mentah di atas biar gampang dikonsumsi:
        // kuncinya tetap, genre dipecah jadi array.
        const detail = {
            judul: info['Judul'] || title,
            japanese: info['Japanese'] || '',
            skor: info['Skor'] || '',
            produser: info['Produser'] || '',
            tipe: info['Tipe'] || '',
            status: info['Status'] || '',
            totalEpisode: info['Total Episode'] || '',
            durasi: info['Durasi'] || '',
            tanggalRilis: info['Tanggal Rilis'] || '',
            studio: info['Studio'] || '',
            genre: info['Genre'] ? info['Genre'].split(',').map(g => g.trim()).filter(Boolean) : []
        };

        return { title, thumbnail, info, synopsis, episodes, detail };
    } catch (error) {
        console.error('Error saat scraping halaman detail anime:', error.message);
        return null;
    }
}

// detail satu episode: link embed streaming + link download per resolusi.
// ini dulu adanya di lib/otaku.js, sekarang nyatu di sini.
async function episode(epUrl) {
    try {
        const html = await ambil(epUrl);
        const $ = cheerio.load(html);

        let title = $('h1.posttl').text().trim() || $('title').text().trim();
        title = title.replace(/\s*[–—-]\s*OtakuDesu.*$/i, '').trim();

        // player utamanya iframe pertama yg bukan iklan/widget
        let embed = '';
        $('iframe').each((i, el) => {
            if (embed) return;
            let src = $(el).attr('src') || '';
            if (src.startsWith('//')) src = 'https:' + src;
            if (!/^https?:\/\//i.test(src)) return;
            if (/a-ads\.com|discord(app)?\.com|challenges\.cloudflare\.com/i.test(src)) return;
            embed = src;
        });

        // area download: tiap baris ada label resolusi (Mp4 360p, dll) + beberapa provider
        const downloads = [];
        $('.download ul li').each((i, el) => {
            const resolution = $(el).find('strong').first().text().trim();
            const links = [];
            $(el).find('a').each((j, a) => {
                const href = $(a).attr('href');
                if (href) links.push({ provider: $(a).text().trim(), url: href });
            });
            if (resolution && links.length) downloads.push({ resolution, links });
        });

        // daftar server mirror per kualitas. tiap server bawa token base64 berisi
        // {id, i, q} yg ditukar lewat ajax admin-ajax (mekanismenya ada di skrip halaman).
        // ini penting karena server bawaan (otakuwatch) file videonya dari googlevideo
        // yg sering nolak unduhan server, sedangkan odstream mp4 polos dari cdn sendiri.
        const mirrors = [];
        $('.mirrorstream ul, ul.m360p, ul.m480p, ul.m720p, ul.m1080p').each((i, ul) => {
            const quality = ($(ul).attr('class') || '').replace(/^m/, '');
            $(ul).find('a[data-content]').each((j, a) => {
                try {
                    const token = JSON.parse(Buffer.from($(a).attr('data-content'), 'base64').toString('utf8'));
                    mirrors.push({ quality, server: $(a).text().trim(), id: token.id, i: token.i, q: token.q });
                } catch {}
            });
        });
        // nonce embed ga nempel di halaman (nilainya null di awal). dia didapet
        // lewat ajax terpisah pas user klik server: action pertama buat minta nonce,
        // action kedua buat nukar token mirror pake nonce itu.
        const aksi = [...html.matchAll(/action:\s*["']([0-9a-f]{32})["']/g)].map(m => m[1]);
        const ajaxAction = aksi[0] || '';
        const nonceAction = aksi.find(a => a !== ajaxAction) || '';

        return { url: epUrl, title, embed, downloads, mirrors, nonce: '', ajaxAction, nonceAction };
    } catch (error) {
        console.error('Error saat scraping episode:', error.message);
        return null;
    }
}

// bongkar halaman embed desustream buat dapetin file mp4 aslinya.
// playernya ada 2 rasa: yg satu naruh link googlevideo (blogger) di <video>,
// yg satu lagi mp4 langsung dari cdn odcloud. dua2nya plain, ga di-pack.
async function resolveVideo(embedUrl) {
    try {
        const { data: htmlPage } = await axios.get(embedUrl, {
            headers: { 'User-Agent': headers['User-Agent'], 'Referer': BASE + '/' },
            timeout: 20000
        });
        const page = String(htmlPage);
        const gv = page.match(/https?:\/\/[^"'\s]+googlevideo\.com\/videoplayback[^"'\s]+/);
        if (gv) return { ok: true, url: gv[0].replace(/&amp;/g, '&'), kind: 'googlevideo' };
        const mp4 = page.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
        if (mp4) return { ok: true, url: mp4[0].replace(/&amp;/g, '&'), kind: 'mp4' };
        const m3u8 = page.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (m3u8) return { ok: true, url: m3u8[0].replace(/&amp;/g, '&'), kind: 'hls' };
        return { ok: false, reason: 'File video tidak ditemukan di halaman embed' };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

// minta nonce embed ke ajax (langkah pertama jabat tangan di halaman aslinya)
async function ambilNonce(detail) {
    const body = new URLSearchParams({ action: detail.nonceAction });
    const { data } = await axios.post(`${BASE}/wp-admin/admin-ajax.php`, body, {
        headers: { 'User-Agent': headers['User-Agent'], 'Referer': detail.url, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000
    });
    const nonce = data && typeof data === 'object' ? data.data : '';
    if (!nonce) throw new Error('Gagal mendapatkan nonce embed');
    return nonce;
}

// tukar token mirror jadi embed iframe lewat ajax bawaan temanya
async function fetchMirrorEmbed(detail, mirror) {
    if (!detail.nonce) detail.nonce = await ambilNonce(detail);
    const body = new URLSearchParams({ id: mirror.id, i: mirror.i, q: mirror.q, nonce: detail.nonce, action: detail.ajaxAction });
    const { data } = await axios.post(`${BASE}/wp-admin/admin-ajax.php`, body, {
        headers: { 'User-Agent': headers['User-Agent'], 'Referer': detail.url, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000
    });
    const b64 = data && typeof data === 'object' ? data.data : null;
    if (!b64) throw new Error('Server mirror tidak mengembalikan embed');
    const embedHtml = Buffer.from(b64, 'base64').toString('utf8');
    const src = (embedHtml.match(/<iframe[^>]*src="([^"]+)"/i) || [])[1];
    if (!src) throw new Error('Embed mirror kosong');
    return src.startsWith('//') ? 'https:' + src : src;
}

// tanya ukuran file tanpa mengunduh (buat skip kandidat yg jelas kegedean)
async function ukurFile(url) {
    try {
        const r = await axios.head(url, { headers: { 'User-Agent': headers['User-Agent'] }, timeout: 15000, maxRedirects: 5 });
        const len = parseInt(r.headers['content-length'] || 0);
        if (len) return len;
    } catch {}
    try {
        const r = await axios.get(url, { headers: { 'User-Agent': headers['User-Agent'], 'Range': 'bytes=0-0' }, responseType: 'stream', timeout: 15000, maxRedirects: 5 });
        r.data.destroy();
        const cr = r.headers['content-range'];
        if (cr) return parseInt(cr.split('/')[1]) || 0;
        return parseInt(r.headers['content-length'] || 0);
    } catch {}
    return 0;
}

// unduh file video per potongan pake header Range (10MB per tarikan).
// wajib begini buat googlevideo: kalo GET polos tanpa Range, kecepatannya
// dilambatin parah sama mereka (pengalaman: 80KB/s vs 6MB/s pake Range).
async function unduhMp4(url, destPath, maxBytes, referer) {
    const CHUNK = 10 * 1024 * 1024;
    const bagian = [];
    let pos = 0;
    let fileSize = 0;
    while (true) {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': headers['User-Agent'], 'Referer': referer || BASE + '/', 'Range': `bytes=${pos}-${pos + CHUNK - 1}` },
            timeout: 120000,
            maxRedirects: 5,
            validateStatus: s => s === 200 || s === 206
        });
        const cr = res.headers['content-range'];
        if (cr) fileSize = parseInt((cr.split('/')[1] || '').trim()) || fileSize;
        const buf = Buffer.from(res.data);
        if (res.status === 200) {
            // servernya cuek sama Range, dia kirim file utuh sekaligus. yaudah terima aja
            if (pos > 0) throw new Error('Server memutus unduhan di tengah jalan');
            if (buf.length > maxBytes) throw new Error(`Ukuran video melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
            fs.writeFileSync(destPath, buf);
            return buf.length;
        }
        if (!buf.length) break;
        pos += buf.length;
        if (pos > maxBytes) throw new Error(`Ukuran video melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
        bagian.push(buf);
        if (fileSize && pos >= fileSize) break;
        if (!fileSize && buf.length < CHUNK) break;
    }
    fs.writeFileSync(destPath, Buffer.concat(bagian));
    return pos;
}

// unduh video episode ke file lokal, nyoba semua server mirrornya satu2.
// urutan prioritas server berdasarkan pengalaman: odstream paling gampang
// (mp4 polos), abis itu yg bersumber googlevideo (moedesu & embed bawaan),
// sisanya cadangan. mega diskip (ga bisa diunduh tanpa akun).
// kualitas 480p didahulukan biar ukurannya masuk akal buat dikirim ke WA.
async function downloadVideo(detail, destPath, opts = {}) {
    const maxBytes = opts.maxBytes || 100 * 1024 * 1024;
    const mir = (detail.mirrors || []).filter(mm => !/^mega$/i.test(mm.server));

    const skorServer = (nama) => {
        const n = nama.toLowerCase();
        if (n.startsWith('odstream')) return 0;
        if (n.startsWith('moedesu')) return 1;
        if (n.startsWith('vidhide')) return 2;
        if (n.startsWith('mp4load')) return 3;
        if (n.startsWith('yourupload')) return 4;
        return 5;
    };
    const skorKualitas = (q) => ({ '480p': 0, '360p': 1, '720p': 2, '1080p': 3 }[q] ?? 4);

    const kandidat = mir
        .map(mm => ({ label: `${mm.server} ${mm.quality}`, mirror: mm, skor: skorServer(mm.server) * 10 + skorKualitas(mm.quality) }))
        .sort((a, b) => a.skor - b.skor);
    // embed bawaan halaman = salah satu mirror juga (biasanya yg data-default),
    // jadi cuma ditambah kalo daftar mirrornya kosong
    if (!kandidat.length && detail.embed) kandidat.push({ label: 'Desustream', embed: detail.embed, skor: 99 });

    if (!kandidat.length) throw new Error('Tidak ada server streaming yang bisa dicoba');

    // dua putaran percobaan: server embednya kadang ngasih respons aneh sesaat
    // (halaman kosong / "ID tidak valid"), jadi kalo semua server gagal di
    // putaran pertama, tunggu bentar terus ulangi pake embed & nonce fresh.
    let lastErr = null;
    for (let putaran = 1; putaran <= 2; putaran++) {
        if (putaran > 1) {
            detail.nonce = '';
            await new Promise(r => setTimeout(r, 5000));
        }
        for (const c of kandidat) {
            try {
                const embedUrl = c.embed || await fetchMirrorEmbed(detail, c.mirror);
                const r = await resolveVideo(embedUrl);
                if (!r.ok) throw new Error(r.reason);
                if (r.kind === 'hls') throw new Error('Format HLS belum didukung');
                // cek ukuran di depan buat semua jenis file, biar ga buang waktu
                const sz = await ukurFile(r.url);
                if (sz && sz > maxBytes) throw new Error(`Ukuran video ${(sz / 1048576).toFixed(0)} MB, melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
                const size = await unduhMp4(r.url, destPath, maxBytes, embedUrl);
                return { path: destPath, size, server: c.label, kind: r.kind };
            } catch (e) {
                lastErr = e;
            }
        }
    }
    throw lastErr || new Error('Semua server streaming gagal');
}

// link download dari otakudesu semuanya dibungkus redirector desustream
// (link.desustream.com/?id=...). sebelum dikirim ke user, buka bungkusnya
// dulu: ikuti header Location sampai keluar dari domain redirector, jadi
// yg diterima user link provider aslinya (mega, solidfiles, dll). redirect
// di sisi provider jangan diikutin, contoh zippyshare yg udah mati malah
// ngarah ke halaman depan doang kalo diikutin sampai habis.
async function benerinSatuLink(url) {
    let current = url;
    for (let hop = 0; hop < 3; hop++) {
        let host;
        try { host = new URL(current).hostname; } catch { break; }
        if (host !== 'link.desustream.com') break;
        try {
            const res = await fetch(current, { headers, redirect: 'manual', signal: AbortSignal.timeout(8000) });
            const loc = res.headers.get('location');
            try { await res.body?.cancel(); } catch {}
            if (res.status < 300 || res.status >= 400 || !loc) break;
            current = new URL(loc, current).href;
        } catch { break; }
    }
    return current;
}

async function fixLink(downloads) {
    const semua = [];
    for (const row of downloads || []) for (const l of row.links || []) semua.push(l);
    // jangan ditembak barengan semua, desustream/cloudflare gampang gagal
    // kalo ratusan request paralel. jalan 6-6 aja, yg masih kebungkus
    // dicoba sekali lagi.
    let antre = 0;
    const jalan = async () => {
        while (antre < semua.length) {
            const l = semua[antre++];
            for (let coba = 0; coba < 2; coba++) {
                const asli = await benerinSatuLink(l.url);
                if (asli && asli !== l.url) { l.url = asli; break; }
                if (!l.url.includes('link.desustream.com')) break;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(6, semua.length) }, jalan));
    return downloads;
}

module.exports = { search, detail, episode, resolveVideo, downloadVideo, fixLink };
