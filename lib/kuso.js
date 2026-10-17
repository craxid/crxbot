const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://kusonime.com';

function cleanText(text) {
    if (!text) return 'N/A';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8230;/g, '...')
        .replace(/&quot;/g, '"')
        .replace(/<[^>]*>?/gm, '')
        .trim();
}

async function searchAnime(query) {
    try {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=post`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        $('.venz ul li, .detpost').each((i, el) => {
            const title = $(el).find('h2 a').text().trim();
            const postUrl = $(el).find('h2 a').attr('href');
            if (title && postUrl) {
                results.push({ title, url: postUrl });
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching anime:', error.message);
        return [];
    }
}

async function scrapePostDetails(url) {
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? cleanText(titleMatch[1]) : 'N/A';

        const descMatch = html.match(/<meta name="description" content="(.*?)"/);
        const description = descMatch ? cleanText(descMatch[1]) : 'N/A';

        const info = {};
        const infoRegex = /<b>(.*?)<\/b>\s*:\s*(.*?)(?:<\/p>|<br\s*\/?>)/g;
        let match;
        while ((match = infoRegex.exec(html)) !== null) {
            const key = match[1].trim();
            const val = match[2].trim();
            info[key] = cleanText(val);
        }

        // Ambil sinopsis dari paragraf yang relevan
        let synopsis = '';
        const paragraphs = [];
        $('p').each((i, el) => {
            const txt = $(el).text().trim();
            if (txt.length > 50 &&
                !txt.includes('Download') &&
                !txt.includes('Subtitle') &&
                !txt.includes('Episode') &&
                !txt.includes('Terimakasih') &&
                !txt.includes('Bloody Smart') &&
                !txt.includes('Under Ninja') &&
                !txt.includes('Kimetsu') &&
                !txt.includes('Golden Kamuy') &&
                !txt.includes('Producers') &&
                !txt.includes('Japanese') &&
                !txt.includes('Genre') &&
                !txt.includes('Season') &&
                !txt.includes('Released') &&
                !txt.includes('Score')) {
                paragraphs.push(txt);
            }
        });

        // Cari paragraf yang mengandung karakter/cerita
        for (const p of paragraphs) {
            if (p.length > 100 && !p.includes('Subtitle') && !p.includes('Download')) {
                synopsis = p;
                break;
            }
        }

        const downloads = [];
        const dlMatch = html.match(/<div id="dl">(.*?)<\/div><\/div><\/div><\/div><div class='socialshare'>/s);
        const dlHtml = dlMatch ? dlMatch[1] : '';

        if (dlHtml) {
            const dlRegex = /<strong>(.*?)<\/strong>\s*(.*?)<\/div>/gs;
            let dlMatchResult;
            while ((dlMatchResult = dlRegex.exec(dlHtml)) !== null) {
                const quality = dlMatchResult[1].trim();
                const linksHtml = dlMatchResult[2];

                const links = {};
                const linkRegex = /<a href="(.*?)".*?>(.*?)<\/a>/g;
                let linkMatch;
                while ((linkMatch = linkRegex.exec(linksHtml)) !== null) {
                    const linkUrl = linkMatch[1].replace(/&amp;/g, '&');
                    const host = linkMatch[2].trim();
                    links[host] = linkUrl;
                }

                if (Object.keys(links).length > 0) {
                    downloads.push({ quality, links });
                }
            }
        }

        return {
            title,
            description,
            synopsis,
            info,
            downloads
        };
    } catch (error) {
        console.error('Error scraping post:', error.message);
        return null;
    }
}

module.exports = {
    searchAnime,
    scrapePostDetails
};