const util = require('util');
const axios = require('axios'); // Tambahkan module axios
const { gdrive } = require('../lib/resapi.js'); 

function tipe_mime(nama_file, mime_cadangan) {
    const ekstensi = nama_file.split('.').pop().toLowerCase();
    const mimes = {
        'rar': 'application/x-rar-compressed',
        'zip': 'application/zip',
        '7z': 'application/x-7z-compressed',
        'apk': 'application/vnd.android.package-archive',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'mp4': 'video/mp4',
        'mkv': 'video/x-matroska',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'mcworld': 'application/vnd.mojang.minecraft', // Agar terbaca normal di WA
        'mcpack': 'application/vnd.mojang.minecraft'
    };
    return mimes[ekstensi] || mime_cadangan;
}

let handler = async (m, { conn, text, usedPrefix: awalan, command: perintah }) => {
    if (!text || !text.includes('drive.google.com')) {
        return m.reply(`*Contoh:* ${awalan + perintah} https://drive.google.com/file/d/1thDYWcS5p5FFhzTpTev7RUv0VFnNQyZ4/view`);
    }

    const cek_id = text.match(/[-\w]{25,}/);
    if (!cek_id) return m.reply("❌ ID File tidak ditemukan.");
    const id_file = cek_id[0];
    
    try {
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
        if (typeof wait !== 'undefined') m.reply(wait);

        const data_drive = await gdrive(text.trim());

        const batas_ukuran = 200 * 1024 * 1024; 
        if (data_drive.size_bytes > batas_ukuran) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            return m.reply(`❌ *Gagal:* Ukuran file (*${data_drive.size_formatted}*) melebihi batas 200 MB.`);
        }

        let info_pesan = `*📥 GOOGLE DRIVE*\n\n📄 *Nama:* ${data_drive.file_name}\n🗂️ *Ukuran:* ${data_drive.size_formatted}\n\n_Sedang mengirim..._`;
        await m.reply(info_pesan);

        const mime_tetap = tipe_mime(data_drive.file_name, data_drive.mimetype);

        // Ambil file sebagai stream via Axios untuk menyertakan Cookie bypass
        const stream_file = await axios.get(data_drive.direct_download_url, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Cookie': data_drive.cookie || '' // Cookie injeksi
            }
        });

        await conn.sendMessage(m.chat, {
            document: { stream: stream_file.data }, // Lempar stream Axios langsung ke Baileys
            fileName: data_drive.file_name,
            mimetype: mime_tetap 
        }, { quoted: m });

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        m.reply(`❌ *Error:* ${util.format(e.message)}`);
    }
}

handler.command = ['gdrive', 'gdrivedl'];
handler.register = true;
handler.limit = true;
module.exports = handler;