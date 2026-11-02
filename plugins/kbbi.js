const axios = require('axios');
const cheerio = require('cheerio');

// Sumber utama: API KBBI yg datanya cerminan aplikasi KBBI resmi (edisi terbaru).
// Sumber lama (kbbi.web.id) basis datanya edisi lawas, kata baru kayak
// "karhutla" ga ada di sana; di sini kata itu ketemu.
const API_URL = 'https://kbbi.raf555.dev/api/v1/entry/';

// Ambil arti dari API. Balikan teks yg sudah diformat, atau null kalo kata
// tidak ditemukan (404). Error jaringan/server dilempar ke pemanggil.
async function dariApi(kata) {
    let data;
    try {
        ({ data } = await axios.get(API_URL + encodeURIComponent(kata), { timeout: 20000 }));
    } catch (e) {
        if (e.response && e.response.status === 404) return null;
        throw e;
    }
    if (!data || !Array.isArray(data.entries) || !data.entries.length) return null;

    let blok = [];
    for (let entri of data.entries) {
        if (!entri.definitions || !entri.definitions.length) continue;
        let judul = `*${entri.entry}*`;
        if (entri.baseWord && entri.baseWord !== data.lemma) judul += ` (kata dasar: ${entri.baseWord})`;
        let baris = [judul];
        entri.definitions.forEach((d, i) => {
            let kelas = (d.labels || []).map(l => l.code).filter(Boolean).join(', ');
            // definisi kosong + ada rujukan = entri silang, tampilkan arahnya
            let definisi = d.definition || (d.referencedLemma ? `lihat *${d.referencedLemma}*` : '');
            baris.push(`   ${i + 1}. ${kelas ? `_${kelas}_ ` : ''}${definisi}`);
            for (let contoh of d.usageExamples || []) {
                // di data KBBI, "--" dan "~" itu penanda kata yg dicari
                baris.push(`      Contoh: "${contoh.replace(/--|~/g, data.lemma)}"`);
            }
        });
        blok.push(baris.join('\n'));
    }
    return blok.length ? blok.join('\n\n') : null;
}

// Cadangan kalo API utama lagi gangguan: mirror lama kbbi.web.id.
// Datanya edisi lawas (sebagian kata baru ga ada), tapi kata umum lengkap.
async function dariWebId(kata) {
    const { data } = await axios.get(`https://kbbi.web.id/${encodeURIComponent(kata)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        timeout: 20000
    });

    const $ = cheerio.load(data);

    // Konversi tag <br> jadi newline
    $('div#d1').find('br').replaceWith('\n');

    // Injeksi spasi & konversi tag HTML ke format Markdown WhatsApp
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

    // Halaman "tidak ditemukan" di web.id isinya kalimat maaf ini, BUKAN arti;
    // versi lama plugin salah membacanya sbg hasil. Cek kalimat aslinya.
    if (!artiRaw || artiRaw.includes('tidak ditemukan kata') || artiRaw.includes('Pencarian Anda')) {
        return null;
    }

    // Bersihkan spasi berlebih yang muncul dari proses injeksi di atas
    let arti = artiRaw.replace(/[ \t]+/g, ' ');

    // Deteksi angka definisi (1, 2, 3) dan pisahkan ke baris baru
    arti = arti.replace(/ (\*?\d+\*?) /g, '\n   $1 ');

    // Susun ulang list agar berjarak lega dan punya indentasi
    return arti.split('\n')
        .map(baris => baris.trim())
        .filter(baris => baris.length > 0)
        .map(baris => {
            if (baris.match(/^(\*?\d+\*?)/)) return `   ${baris}`;
            return `• ${baris}`;
        })
        .join('\n\n');
}

let handler = async (m, { conn, text }) => {
    if (!text) throw `Masukkan kata yang ingin dicari di KBBI`;

    let kata = text.trim().toLowerCase();
    let arti = null;
    let apiError = null;
    let webError = null;

    try {
        arti = await dariApi(kata);
    } catch (e) {
        apiError = e;
    }

    if (!arti) {
        try {
            arti = await dariWebId(kata);
        } catch (e) {
            webError = e;
        }
    }

    if (!arti) {
        // dua-duanya error jaringan = layanan lagi gangguan, bukan kata yg salah
        if (apiError && webError) {
            return m.reply(`Terjadi kesalahan saat mencari kata "${text}" di KBBI.`);
        }
        return m.reply(`Kata "${text}" tidak ditemukan di KBBI.`);
    }

    m.reply(`*KBBI*\n\n*Kata:* ${text}\n*Arti:*\n${arti}`);
}

handler.help = ['kbbi'];
handler.tags = ['tools'];
handler.command = ['kbbi', 'kamus'];

module.exports = handler;
