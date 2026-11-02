const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { execFile } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// iframe2 ini bukan video, cuma iklan/widget/proteksi. buang aja dari hasil
const EMBED_SKIP = /(a-ads\.com|discord(app)?\.com|challenges\.cloudflare\.com|google\.com\/recaptcha|googlesyndication|doubleclick)/i;

function providerDariUrl(u) {
    try {
        const h = new URL(u).hostname.replace(/^www\./, '');
        if (/playmogo/i.test(h)) return 'Playmogo';
        if (/streampoi/i.test(h)) return 'Streampoi';
        if (/dood|ds2play|d0o0d/i.test(h)) return 'DoodStream';
        if (/streamruby/i.test(h)) return 'StreamRuby';
        return h;
    } catch {
        return 'Server';
    }
}

/**
 * Ambil detail dari halaman episode NekoPoi
 * @param {string} url - Link episode Nekopoi
 * @returns {Promise<Object>} detail + link streaming & download
 */
async function detail(url) {
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });

        const $ = cheerio.load(data);

        // judul, cheerio udah decode entity jadi suffix situsnya dibersihin pake regex aja
        let title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        title = title.replace(/\s*[–—-]\s*NekoPoi.*$/i, '').replace(/&#8211;/g, '-').trim();

        const thumbnail = $('.nk-featured-img img').attr('src') || $('meta[property="og:image"]').attr('content') || '';

        // sinopsis/info, ambil dari .konten kyk sebelumnya
        const info = [];
        $('.konten p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) info.push(text);
        });
        const synopsis = info.join('\n') || $('meta[name="description"]').attr('content') || '';

        // Link streaming: tema nekopoi sekarang naronya iframe polos di artikel,
        // udah ga dibungkus .nk-player-frame lagi (itu selector lama, makanya kosong terus).
        // jadi ambil semua iframe, terus saring yg bukan iklan/widget.
        const streams = [];
        $('iframe').each((i, el) => {
            let src = $(el).attr('src') || '';
            if (src.startsWith('//')) src = 'https:' + src;
            if (!/^https?:\/\//i.test(src)) return;
            if (EMBED_SKIP.test(src)) return;
            if (streams.some(s => s.url === src)) return;
            streams.push({ provider: providerDariUrl(src), url: src });
        });
        // buat kompatibilitas pemanggil lama yg cuma butuh daftar url
        const streaming = streams.map(s => s.url);

        // Link download per resolusi, ini masih sama kyk dulu
        const downloads = [];
        $('.nk-download-row').each((i, el) => {
            const resolution = $(el).find('.nk-download-name').text().trim();
            const links = [];
            $(el).find('.nk-download-links a').each((j, a) => {
                links.push({ provider: $(a).text().trim(), url: $(a).attr('href') });
            });
            if (resolution && links.length > 0) downloads.push({ resolution, links });
        });

        return {
            status: true,
            creator: 'CraXID',
            result: { title, thumbnail, synopsis, streaming, streams, downloads }
        };
    } catch (error) {
        return {
            status: false,
            message: 'Gagal mengambil data. Pastikan link valid atau cek koneksi internet.',
            error: error.message
        };
    }
}

// bongkar js yg di-pack pake p.a.c.k.e.r (streampoi/streamruby suka begini),
// isinya config jwplayer yg ada url m3u8nya. murni main string, ga ngejalanin eval dari situsnya.
function unpackPacker(html) {
    const m = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)\)/);
    if (!m) return null;
    const payload = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const radix = +m[2];
    const words = m[4].split('|');
    const token = (i) => {
        let s = '', n = i;
        do {
            const r = n % radix;
            s = (r < 10 ? String(r) : String.fromCharCode(r + 87)) + s;
            n = Math.floor(n / radix);
        } while (n > 0);
        return s;
    };
    const map = {};
    for (let i = 0; i < words.length; i++) map[token(i)] = words[i] || token(i);
    return payload.replace(/\b[0-9a-zA-Z]+\b/g, w => map[w] || w);
}

/**
 * Ubah link embed streaming jadi file video yg bisa diunduh.
 * Streampoi bisa (m3u8nya ketemu abis unpack). Playmogo/Dood kena Cloudflare
 * dari sisi server, jadi balikin ok:false biar pemanggil bisa fallback.
 */
async function resolve(embedUrl) {
    const provider = providerDariUrl(embedUrl);
    try {
        const { data: html } = await axios.get(embedUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://nekopoi.care/' },
            timeout: 20000
        });
        if (typeof html !== 'string') return { ok: false, provider, reason: 'Respons embed tidak valid' };
        if (/just a moment|challenges\.cloudflare/i.test(html) && !/jwplayer|sources/i.test(html)) {
            return { ok: false, provider, reason: 'Server streaming diblokir Cloudflare, tidak bisa diambil dari bot' };
        }
        const texts = [unpackPacker(html), html].filter(Boolean);
        for (const t of texts) {
            const m3u8 = t.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
            if (m3u8) return { ok: true, provider, type: 'hls', url: m3u8[0] };
            const mp4 = t.match(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/);
            if (mp4) return { ok: true, provider, type: 'file', url: mp4[0] };
        }
        return { ok: false, provider, reason: 'URL video tidak ditemukan di halaman embed' };
    } catch (e) {
        return { ok: false, provider, reason: e.message };
    }
}

async function ambilPlaylist(url) {
    const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
    return String(data);
}

function durasiPlaylist(text) {
    let total = 0;
    for (const m of text.matchAll(/#EXTINF:([\d.]+)/g)) total += parseFloat(m[1]);
    return total;
}

// pilih varian kualitas paling bagus yg estimasi ukurannya masih muat di maxBytes
async function pickHlsVariant(masterUrl, maxBytes) {
    const master = await ambilPlaylist(masterUrl);
    const lines = master.split('\n').map(l => l.trim());
    const variants = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('#EXT-X-STREAM-INF')) continue;
        const bw = /BANDWIDTH=(\d+)/.exec(lines[i]);
        const res = /RESOLUTION=([\dx]+)/.exec(lines[i]);
        const uri = lines.slice(i + 1).find(l => l && !l.startsWith('#'));
        if (uri) variants.push({ url: new URL(uri, masterUrl).href, bandwidth: bw ? +bw[1] : 0, resolution: res ? res[1] : '' });
    }
    if (!variants.length) {
        // bukan master playlist, berarti ini udah playlist media langsung
        return { url: masterUrl, bandwidth: 0, resolution: '', duration: durasiPlaylist(master), estBytes: 0 };
    }
    for (const v of variants) {
        try {
            v.duration = durasiPlaylist(await ambilPlaylist(v.url));
            v.estBytes = v.bandwidth ? Math.round(v.bandwidth / 8 * v.duration) : 0;
        } catch { v.duration = 0; v.estBytes = 0; }
    }
    const muat = variants.filter(v => v.estBytes > 0 && v.estBytes <= maxBytes).sort((a, b) => b.bandwidth - a.bandwidth);
    if (muat.length) return muat[0];
    // ga ada yg muat, balikin yg paling kecil aja biar pemanggil yg mutusin
    return variants.sort((a, b) => (a.estBytes || a.bandwidth) - (b.estBytes || b.bandwidth))[0];
}

/**
 * Unduh video dari link embed streaming jadi file mp4 lokal (remux HLS pake ffmpeg, tanpa re-encode).
 * @param {string} embedUrl link embed (mis. streampoi)
 * @param {string} destPath tujuan file .mp4
 * @param {{maxBytes?: number, maxSeconds?: number}} opts maxSeconds cuma buat motong durasi pas pengujian
 */
async function downloadVideo(embedUrl, destPath, opts = {}) {
    const maxBytes = opts.maxBytes || 100 * 1024 * 1024;
    const r = await resolve(embedUrl);
    if (!r.ok) throw new Error(`${r.provider}: ${r.reason}`);

    let src = r.url;
    let variant = null;
    if (r.type === 'hls') {
        variant = await pickHlsVariant(r.url, maxBytes);
        // estimasi aja udah lewat batas, ga usah buang2 bandwidth
        if (variant.estBytes && variant.estBytes > maxBytes * 1.05) {
            throw new Error(`Ukuran video diperkirakan ${(variant.estBytes / 1048576).toFixed(0)} MB, melebihi batas ${(maxBytes / 1048576).toFixed(0)} MB`);
        }
        src = variant.url;
    }

    const args = ['-hide_banner', '-loglevel', 'error', '-user_agent', UA];
    if (opts.maxSeconds) args.push('-t', String(opts.maxSeconds));
    args.push('-i', src, '-c', 'copy', '-movflags', '+faststart', '-y', destPath);

    await new Promise((resolve, reject) => {
        execFile('ffmpeg', args, { timeout: 15 * 60 * 1000 }, (err) => {
            if (err) reject(new Error('ffmpeg gagal mengunduh stream: ' + err.message));
            else resolve();
        });
    });

    const size = fs.statSync(destPath).size;
    if (size > maxBytes * 1.15) throw new Error(`File hasil unduhan ${(size / 1048576).toFixed(0)} MB, melebihi batas kirim WhatsApp`);
    return { path: destPath, size, provider: r.provider, resolution: variant ? variant.resolution : '', duration: variant ? Math.round(variant.duration) : 0 };
}

module.exports = { detail, resolve, downloadVideo };
