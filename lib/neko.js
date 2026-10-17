const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi untuk mengambil detail dari URL NekoPoi
 * @param {string} url - Link episode Nekopoi
 * @returns {Promise<Object>} - Object berisi data hasil scraping
 */
async function scrapeNekoDetail(url) {
    try {
        // Menggunakan User-Agent agar tidak mudah diblokir oleh sistem anti-bot
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        // 1. Ekstrak Judul
        // Mengambil dari meta og:title atau tag title
        let title = $('meta[property="og:title"]').attr('content') || $('title').text();
        title = title.replace(' &#8211; NekoPoi', '').trim();

        // 2. Ekstrak Thumbnail/Gambar
        const thumbnail = $('.nk-featured-img img').attr('src') || '';

        // 3. Ekstrak Sinopsis & Info Anime
        let info = [];
        $('.konten p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) info.push(text);
        });
        const synopsis = info.join('\n');

        // 4. Ekstrak Link Streaming (Iframe)
        const streaming = [];
        $('.nk-player-frame iframe').each((i, el) => {
            const streamUrl = $(el).attr('src');
            if (streamUrl) streaming.push(streamUrl);
        });

        // 5. Ekstrak Link Download Berdasarkan Resolusi
        const downloads = [];
        $('.nk-download-row').each((i, el) => {
            const resolution = $(el).find('.nk-download-name').text().trim();
            const links = [];
            
            $(el).find('.nk-download-links a').each((j, a) => {
                links.push({
                    provider: $(a).text().trim(),
                    url: $(a).attr('href')
                });
            });

            if (resolution && links.length > 0) {
                downloads.push({
                    resolution,
                    links
                });
            }
        });

        return {
            status: true,
            creator: 'CraXID',
            result: {
                title,
                thumbnail,
                synopsis,
                streaming,
                downloads
            }
        };

    } catch (error) {
        return {
            status: false,
            message: 'Gagal mengambil data. Pastikan link valid atau cek koneksi internet/CORS.',
            error: error.message
        };
    }
}

// Export module agar bisa ditarik ke handler bot WhatsApp
module.exports = { scrapeNekoDetail };