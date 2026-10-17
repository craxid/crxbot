const axios = require('axios');

let handler = async (m, { conn, text }) => {
    if (!text) throw `✳️ Masukkan kueri yang ingin dicari di Wikipedia`;

    const fetchWiki = async (lang, query) => {
        // Menambahkan 'pageimages' (yang secara otomatis mengambil 'pageimage' = nama file)
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|pageterms&exintro=true&explaintext=true&redirects=1&pithumbsize=500&wbptterms=description&titles=${encodeURIComponent(query)}`;
        
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' 
            }
        });

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === '-1' || !pages[pageId].extract) {
            throw new Error('Artikel tidak ditemukan');
        }

        const page = pages[pageId];
        const thumb = page.thumbnail ? page.thumbnail.source : null;
        
        // Mengambil deskripsi artikel
        const description = page.terms && page.terms.description ? page.terms.description[0] : 'Tidak ada deskripsi singkat';

        // Mengambil nama file gambar (pageimage) untuk dijadikan deskripsi gambar
        let imageDesc = 'Tidak ada gambar tersedia';
        if (page.pageimage) {
            // Membersihkan nama file: ganti underscore jadi spasi, hapus .jpg/.png dll
            imageDesc = page.pageimage.replace(/_/g, ' ').replace(/\.(jpg|jpeg|png|gif|svg)$/i, '');
        }

        return {
            title: page.title,
            extract: page.extract,
            description: description,
            imageDesc: imageDesc, // Deskripsi gambar yang sudah dibersihkan
            thumb: thumb,
            lang: lang
        };
    };

    try {
        let result;
        try {
            result = await fetchWiki('id', text);
        } catch (errId) {
            result = await fetchWiki('en', text);
        }

        let textRes = result.extract;
        if (textRes.length > 1000) {
            textRes = textRes.substring(0, 1000) + '...\n\n_[Teks terlalu panjang, dipotong]_';
        }

        const titleForUrl = encodeURIComponent(result.title.replace(/ /g, '_'));
        const articleUrl = `https://${result.lang}.wikipedia.org/wiki/${titleForUrl}`;

        // Menyusun caption dengan deskripsi gambar
        const captionText = `▢ *Wikipedia (${result.lang.toUpperCase()})*\n\n` +
`*${result.title}*\n` +
`_${result.description}_\n\n` + 
`🖼️ *Gambar:* ${result.imageDesc}\n\n` + // Menampilkan deskripsi gambar
`${textRes.trim()}\n\n` +
`🔗 *Baca selengkapnya:* ${articleUrl}`;

        if (result.thumb) {
            await conn.sendMessage(m.chat, { image: { url: result.thumb }, caption: captionText }, { quoted: m });
        } else {
            m.reply(captionText);
        }
        
    } catch (e) {
        m.reply(`⚠️ Tidak ada hasil ditemukan untuk "${text}" di Wikipedia ID maupun EN.`);
    }
}

handler.help = ['wikipedia'];
handler.tags = ['tools'];
handler.command = ['wiki', 'wikipedia'];

module.exports = handler;
