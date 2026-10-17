const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Tambahkan Header palsu agar request terbaca seperti dari browser asli (Chrome PC)
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
};

async function scrapeSearch(query) {
    try {
        const url = `https://otakudesu.blog/?s=${encodeURIComponent(query)}&post_type=anime`;
        // Masukkan headers ke dalam fetch
        const response = await fetch(url, { headers });
        const html = await response.text();
        const $ = cheerio.load(html);

        const results = [];
        $('ul.chivsrc li').each((index, element) => {
            const title = $(element).find('h2 a').text().trim();
            const link = $(element).find('h2 a').attr('href');
            
            const genres = $(element).find('.set b').first().nextAll('a').map((i, el) => $(el).text()).get().join(', ');
            
            const status = $(element).find('.set').eq(1).text().replace('Status : ', '').trim();
            const rating = $(element).find('.set').eq(2).text().replace('Rating : ', '').trim();
            
            if (title && link) {
                results.push({ title, link, genres, status, rating });
            }
        });
        
        return results;
    } catch (error) {
        console.error('Error saat scraping pencarian:', error.message);
        return [];
    }
}

async function scrapeAnimePage(url) {
    try {
        // Masukkan headers ke dalam fetch
        const response = await fetch(url, { headers });
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('.jdlrx h1').text().trim();
        
        const info = {};
        $('.infozingle p').each((index, element) => {
            const bText = $(element).find('b').text();
            const key = bText.replace(':', '').trim();
            
            const value = $(element).text().replace(bText, '').replace(/^:/, '').trim();
            
            if (key) {
                info[key] = value;
            }
        });

        const synopsis = $('.sinopc p').text().trim();

        const episodes = [];
        $('.episodelist ul li').each((index, element) => {
            const episodeTitle = $(element).find('span').first().text().trim();
            const episodeLink = $(element).find('a').attr('href');
            const date = $(element).find('.zeebr').text().trim();
            
            if (episodeTitle && episodeLink) {
                episodes.push({ title: episodeTitle, link: episodeLink, date });
            }
        });

        return { title, info, synopsis, episodes };
    } catch (error) {
        console.error('Error saat scraping halaman detail anime:', error.message);
        return null;
    }
}

module.exports = { scrapeSearch, scrapeAnimePage };