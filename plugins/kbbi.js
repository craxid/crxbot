const axios = require('axios');
const cheerio = require('cheerio');

let handler = async (m, { conn, text }) => {
    if (!text) throw `Masukkan kata yang ingin dicari di KBBI`;

    try {
        const targetUrl = `https://kbbi.web.id/${encodeURIComponent(text.toLowerCase())}`;
        
        const { data } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        
        // 1. Konversi tag <br> jadi newline
        $('div#d1').find('br').replaceWith('\n');
        
        // 2. Injeksi spasi & konversi tag HTML ke format Markdown WhatsApp
        // Ini mencegah bug teks menempel seperti "nis·taa" sekaligus bikin teks Bold
        $('div#d1').find('b, strong').each(function() {
            let txt = $(this).text().trim();
            $(this).replaceWith(` *${txt}* `);
        });
        
        // Mengubah tag kelas kata (seperti 'a', 'v', 'n') jadi Italic
        $('div#d1').find('i, em').each(function() {
            let txt = $(this).text().trim();
            $(this).replaceWith(` _${txt}_ `);
        });
        
        let artiRaw = $('div#d1').text().trim();

        // Validasi jika kata tidak ditemukan
        if (!artiRaw || artiRaw.includes('Pencarian Anda') || artiRaw === '') {
            return m.reply(`Kata "${text}" tidak ditemukan di KBBI.`);
        }

        // Bersihkan spasi berlebih yang muncul dari proses injeksi di atas
        let arti = artiRaw.replace(/[ \t]+/g, ' '); 
        
        // 3. Deteksi angka definisi (1, 2, 3) dan pisahkan ke baris baru
        // Menangkap angka yang diapit spasi (baik itu dalam format *1* maupun 1 biasa)
        arti = arti.replace(/ (\*?\d+\*?) /g, '\n   $1 ');

        // 4. Susun ulang list agar berjarak lega dan punya indentasi
        let artiList = arti.split('\n')
            .map(baris => baris.trim())
            .filter(baris => baris.length > 0)
            .map(baris => {
                // Jika baris diawali dengan angka definisi, posisikan sebagai sub-item (indentasi)
                if (baris.match(/^(\*?\d+\*?)/)) {
                    return `   ${baris}`; 
                }
                // Jika kata baru, jadikan bullet utama
                return `• ${baris}`;
            })
            .join('\n\n');

        const caption = `*KBBI*\n\n*Kata:* ${text}\n*Arti:*\n${artiList}`;
        
        m.reply(caption);
        
    } catch (e) {
        m.reply(`Terjadi kesalahan saat mencari kata "${text}" di KBBI.`);
    }
}

handler.help = ['kbbi'];
handler.tags = ['tools'];
handler.command = ['kbbi', 'kamus'];

module.exports = handler;