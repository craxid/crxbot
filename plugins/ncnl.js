const fetch = require('node-fetch'); // Pastikan node-fetch terinstal: npm install node-fetch

let handler = async (m, { conn }) => {
    let thumb = 'https://telegra.ph/file/016c521fb63069af28cec.jpg';

    // React loading
    await conn.sendMessage(m.chat, { react: { text: '👾', key: m.key } });

    try {
        // Mulai hitung waktu untuk kalkulasi Ping
        let start = Date.now(); 
        
        // Mengambil data dari API mcsrvstat.us
        let res = await fetch(`https://api.mcsrvstat.us/bedrock/3/play.ncnl.eu.cc:19132`);
        let json = await res.json();
        
        // Kalkulasi selisih waktu (Ping dalam ms)
        let ping = Date.now() - start; 

        // Membuat Timestamp agar pesan tidak dianggap spam
        let timestamp = new Date().toLocaleString('id-ID', { 
            timeZone: 'Asia/Jakarta', 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        // Jika server utama offline, cek server fallback
        if (!json.online) {
            let fallbackStart = Date.now(); // Hitung ping ulang untuk fallback
            let fallbackRes = await fetch('https://api.mcsrvstat.us/bedrock/3/play.ncnl.eu.cc:19132');
            let fallbackJson = await fallbackRes.json();
            let fallbackPing = Date.now() - fallbackStart;

            let offlineMsg = `
${global.htki} *NCNL Minecraft* ${global.htka}
${global.gz} *Status:* ${fallbackJson.online ? 'Online (Fallback)' : 'Offline'}
${global.gz} *Ping:* ${fallbackPing} ms
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${fallbackJson.hostname || 'play.ncnl.eu.cc'}
${global.gz} *Port:* ${fallbackJson.port || 19132}
${global.sb}

🕒 *Diperbarui:* ${timestamp} WIB`.trim();

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            return conn.sendMessage(m.chat, { 
                image: { url: thumb }, 
                caption: offlineMsg,
                contextInfo: {
                    forwardingScore: 999, // Angka bisa disesuaikan
                    isForwarded: true
                }
            }, { quoted: m });
        }

        // Jika server utama online
        let onlineMsg = `
${global.htki} *NCNL Minecraft* ${global.htka}
${global.gz} *Versi:* ${json.version || 'Tidak Diketahui'}
${global.gz} *Pemain:* ${json.players?.online || '0'}/${json.players?.max || '0'}
${global.gz} *Mode:* ${json.gamemode || 'Tidak Diketahui'}
${global.gz} *Ping:* ${ping} ms
${global.gz} *MOTD:* ${json.motd?.clean ? json.motd.clean.join(' ') : 'Tidak Ada'}
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${json.hostname || 'play.ncnl.eu.org'}
${global.gz} *Port:* ${json.port}
${global.sb}

🕒 *Diperbarui:* ${timestamp} WIB`.trim();

        // Mengirim balasan gambar beserta caption dan efek forwarded
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        await conn.sendMessage(m.chat, { 
            image: { url: thumb }, 
            caption: onlineMsg,
            contextInfo: {
                forwardingScore: 999, // Angka skor teruskan
                isForwarded: true     // Mengubah status menjadi pesan yang diteruskan
            }
        }, { quoted: m });

    } catch (err) {
        console.error("Error fetching server status:", err);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        m.reply('Terjadi kesalahan saat mengambil data dari API server.');
    }
};

handler.help = ['ncnl'];
handler.customPrefix = /^ncnl$/i;
handler.command = new RegExp; 
handler.group = true;

module.exports = handler;
