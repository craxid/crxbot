const axios = require('axios');
const cheerio = require('cheerio');

const cleanHtml = (str) => {
    if (!str) return '-';
    return str.replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').trim();
};

async function getSpesifikasi(query) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    };

    try {
        // 1. Cari perangkat di versi mobile GSMArena (karena layout search-nya lebih mudah diparsing)
        const searchUrl = `https://m.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`;
        const { data: searchHtml } = await axios.get(searchUrl, { headers });
        const $search = cheerio.load(searchHtml);
        
        // Ambil link detail perangkat dari hasil pencarian pertama
        const firstLink = $search('.makers ul li a').first().attr('href');
        if (!firstLink) {
            throw new Error(`Spesifikasi untuk "${query}" tidak ditemukan.`);
        }

        // 2. Akses halaman spesifikasi perangkat menggunakan versi desktop untuk tabel lengkap
        const detailUrl = `https://www.gsmarena.com/${firstLink}`;
        const { data: detailHtml } = await axios.get(detailUrl, { headers });
        const $ = cheerio.load(detailHtml);

        // Parse nama dan gambar perangkat
        const model = $('.specs-phone-name-title').text().trim();
        const imageUrl = $('.specs-photo-main a img').attr('src') || $('.specs-photo-main img').attr('src');

        // Parse tabel spesifikasi menjadi object (s.Platform.OS, s.Memory.Internal, dll)
        const s = {};
        $('#specs-list table').each((_, table) => {
            const category = $(table).find('th').text().trim(); // cth: "Platform", "Display"
            s[category] = {};
            
            $(table).find('tr').each((_, tr) => {
                const name = $(tr).find('.ttl').text().trim(); // cth: "OS", "Chipset"
                const value = $(tr).find('.nfo').text().trim(); // cth: "Android 10", "Snapdragon 665"
                
                if (name) {
                    s[category][name] = value;
                }
            });
        });

        // 3. Susun caption sesuai dengan format dari handler kamu sebelumnya
        let caption = `
*📱 SPECIFICATIONS: ${model}*

*🌐 NETWORK*
• Technology: ${cleanHtml(s.Network?.Technology)}
• 5G Bands: ${cleanHtml(s.Network?.['5G bands'])}
• Speed: ${cleanHtml(s.Network?.Speed)}

*📅 LAUNCH*
• Announced: ${cleanHtml(s.Launch?.Announced)}
• Status: ${cleanHtml(s.Launch?.Status)}

*🏗️ BODY*
• Dimensions: ${cleanHtml(s.Body?.Dimensions)}
• Weight: ${cleanHtml(s.Body?.Weight)}
• Build: ${cleanHtml(s.Body?.Build)}
• SIM: ${cleanHtml(s.SIM || s.Body?.SIM)}
• Protection: ${cleanHtml(s.Body?.Features)}

*🖥️ DISPLAY*
• Type: ${cleanHtml(s.Display?.Type)}
• Size: ${cleanHtml(s.Display?.Size)}
• Resolution: ${cleanHtml(s.Display?.Resolution)}
• Protection: ${cleanHtml(s.Display?.Protection)}

*⚙️ PLATFORM*
• OS: ${cleanHtml(s.Platform?.OS)}
• Chipset: ${cleanHtml(s.Platform?.Chipset)}
• CPU: ${cleanHtml(s.Platform?.CPU)}
• GPU: ${cleanHtml(s.Platform?.GPU)}

*🗄️ MEMORY*
• Card Slot: ${cleanHtml(s.Memory?.['Card slot'])}
• Internal: ${cleanHtml(s.Memory?.Internal)}

*📸 MAIN CAMERA*
• Detail: ${cleanHtml(s['Main Camera']?.Dual || s['Main Camera']?.Single || s['Main Camera']?.Triple || s['Main Camera']?.Quad)}
• Features: ${cleanHtml(s['Main Camera']?.Features)}
• Video: ${cleanHtml(s['Main Camera']?.Video)}

*🤳 SELFIE CAMERA*
• Single: ${cleanHtml(s['Selfie camera']?.Single)}
• Video: ${cleanHtml(s['Selfie camera']?.Video)}

*🔊 SOUND*
• Loudspeaker: ${cleanHtml(s.Sound?.Loudspeaker)}
• 3.5mm Jack: ${cleanHtml(s.Sound?.['3.5mm jack'])}
• Features: ${cleanHtml(s.Sound?.Features)}

*📡 CONNECTIVITY*
• WLAN: ${cleanHtml(s.Comms?.WLAN)}
• Bluetooth: ${cleanHtml(s.Comms?.Bluetooth)}
• Positioning: ${cleanHtml(s.Comms?.Positioning)}
• NFC: ${cleanHtml(s.Comms?.NFC)}
• USB: ${cleanHtml(s.Comms?.USB)}

*🔋 BATTERY*
• Type: ${cleanHtml(s.Battery?.Type)}
• Charging: ${cleanHtml(s.Battery?.Charging)}

*🇪🇺 EU LABEL*
• Energy: ${cleanHtml(s['EU LABEL']?.Energy)}
• Battery Health: ${cleanHtml(s['EU LABEL']?.Battery)}
• Repairability: ${cleanHtml(s['EU LABEL']?.Repairability)}

*✨ MISC*
• Sensors: ${cleanHtml(s.Features?.Sensors)}
• Colors: ${cleanHtml(s.Misc?.Colors)}
• Models: ${cleanHtml(s.Misc?.Models)}
• Price: ${cleanHtml(s.Misc?.Price)}
`.trim();

        return {
            caption,
            imageUrl,
            model,
            rawSpecs: s // Data mentah (opsional untuk debug)
        };

    } catch (err) {
        // Tampilkan error yang lebih ramah jika gagal scraping
        throw new Error(err.message || 'Gagal mengambil data dari GSMArena.');
    }
}

module.exports = { getSpesifikasi };