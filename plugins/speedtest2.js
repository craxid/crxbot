const FastSpeedtest = require('fast-speedtest-api');

let handler = async (m, { conn }) => {
    try {
        // 1. Reaction Loading
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
        m.reply('_Sedang menjalankan tes kecepatan, harap tunggu..._');

        // 2. Inisialisasi Speedtest
        // Token tidak perlu diubah, ini standar bawaan fast.com
        let speedtest = new FastSpeedtest({
            token: "YXNkZmFzZGZob21lcGFnZWFzZGZhc2RmbGhvc2FkZm9obWVwYWdl", 
            verbose: false, 
            timeout: 10000, 
            https: true, 
            urlCount: 5, 
            bufferSize: 8, 
            unit: FastSpeedtest.UNITS.Mbps 
        });

        // 3. Eksekusi Tes
        let speed = await speedtest.getSpeed();

        // 4. Kirim Hasil
        let caption = `
🚀 *SPEEDTEST RESULTS*

📊 *Kecepatan:* ${speed} Mbps
🌐 *Status:* Terhubung ke Fast.com

_Tes selesai. Kecepatan ini adalah kecepatan server tempat bot berada._
        `.trim();

        await m.reply(caption);
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error(err);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        m.reply(`❌ *Gagal melakukan tes kecepatan:* \n${err.message}`);
    }
}

handler.command = ['speedtest2'];
handler.help = ['speedtest2'];
handler.tags = ['tools'];
handler.register = true;
handler.limit = true;

module.exports = handler;