const cron = require('node-cron');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Inisialisasi object untuk menyimpan cron job di memory
    conn.scheduledMsg = conn.scheduledMsg ? conn.scheduledMsg : {};

    // 1. FITUR HAPUS JADWAL (.automsg -del)
    if (text === '-del') {
        if (!conn.scheduledMsg[m.chat]) {
            throw `Grup ini tidak memiliki jadwal pesan otomatis yang aktif saat ini.`;
        }
        
        // Hentikan cron job dan hapus dari memori
        conn.scheduledMsg[m.chat].stop();
        delete conn.scheduledMsg[m.chat];
        
        return m.reply(`✅ Berhasil menghapus jadwal pesan otomatis di grup ini!`);
    }

    // 2. FITUR ATUR JADWAL BARU (.automsg -j <jam> <teks>)
    if (!text || !text.startsWith('-j')) {
        throw `Format salah! Gunakan perintah berikut:\n\n` +
              `*Untuk Atur Jadwal:*\n${usedPrefix + command} -j 12 Halo teman-teman!\n\n` +
              `*Untuk Hapus Jadwal:*\n${usedPrefix + command} -del`;
    }

    let argumen = text.replace('-j', '').trim();
    let [jamStr, ...pesanArr] = argumen.split(' ');
    let pesan = pesanArr.join(' ').trim();
    let jam = parseInt(jamStr);

    if (isNaN(jam) || jam < 0 || jam > 23) {
        throw `Jam tidak valid! Masukkan angka format 24 jam setelah -j (antara 0 sampai 23).\n\nContoh:\n${usedPrefix + command} -j 12 Jangan lupa absen!`;
    }
    if (!pesan) {
        throw `Harap masukkan teks pesan yang ingin dijadwalkan!\n\nContoh:\n${usedPrefix + command} -j ${jam} Halo semuanya!`;
    }

    if (conn.scheduledMsg[m.chat]) {
        conn.scheduledMsg[m.chat].stop();
    }

    // Buat jadwal baru dengan cron
    let job = cron.schedule(`0 ${jam} * * *`, async () => {
        try {
            // Ambil data metadata grup terbaru saat jadwal tereksekusi
            let groupMetadata = await conn.groupMetadata(m.chat);
            let participants = groupMetadata.participants;
            
            // Ekstrak ID (JID) dari semua member grup
            let memberJids = participants.map(u => u.id);

            // Kirim pesan dengan parameter mentions (Hidetag)
            await conn.reply(m.chat, pesan, null, { mentions: memberJids });
        } catch (e) {
            console.error('Gagal mengirim pesan jadwal hidetag:', e);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Jakarta" 
    });

    conn.scheduledMsg[m.chat] = job;

    m.reply(`✅ Berhasil menjadwalkan pesan hidetag di grup ini!\n\n⏰ Jadwal: Setiap hari jam *${jam}:00 WIB*\n📝 Teks: "${pesan}"\n\n_Untuk menghapus, ketik: ${usedPrefix + command} -del_`);
}

handler.help = ['automsg -j <jam> <teks>', 'automsg -del']
handler.tags = ['tools', 'group']
handler.command = /^(automsg)$/i
handler.admin = true
handler.group = true

module.exports = handler;