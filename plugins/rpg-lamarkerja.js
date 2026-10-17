let handler = async (m, { isPrems, args, conn, text, command, usedPrefix }) => {
    let user = global.db.data.users[m.sender];

    // Syarat level disesuaikan dengan tier pendapatan (Harga Limit = 1000)
    const jobRequirements = {
        // --- Pekerjaan Entry Level (Low-Tier) ---
        'kurir': { min: 5, max: 100000 },
        'gojek': { min: 10, max: 100000 },
        'sopir': { min: 15, max: 100000 },
        'karyawan indomaret': { min: 20, max: 100000 },
        
        // --- Pekerjaan Standar (Mid-Tier) ---
        'kantoran': { min: 25, max: 100000 },
        'polisi': { min: 30, max: 100000 },
        
        // --- Pekerjaan Spesialis / IT (High-Tier) ---
        'frontend developer': { min: 40, max: 100000 },
        'web developer': { min: 45, max: 100000 },
        'backend developer': { min: 50, max: 100000 },
        'game developer': { min: 55, max: 100000 },
        'fullstack developer': { min: 60, max: 100000 },
        
        // --- Pekerjaan Profesional Elit (Top-Tier) ---
        'dokter': { min: 70, max: 100000 },
        'pemain sepak bola': { min: 75, max: 100000 },
        'trader': { min: 80, max: 100000 },
        
        // --- Pekerjaan Underworld / Fantasy (Extreme-Tier) ---
        'pemburu manusia': { min: 90, max: 100000 },
        'pembunuh bayaran': { min: 95, max: 100000 },
        'hunter': { min: 100, max: 100000 }
    };

    // Mencegah eksploitasi spam command saat menunggu proses setTimeout
    if (user.isApplying) {
        throw `⏳ Anda masih dalam proses melamar pekerjaan. Harap tunggu hasilnya!`;
    }

    const COOLDOWN_PERIOD = 3 * 24 * 60 * 60 * 1000; // 3 hari dalam milidetik

    // Perbaikan logika cooldown ganti pekerjaan
    if (user.lastjobchange) {
        let now = new Date();
        if (now - user.lastjobchange < COOLDOWN_PERIOD) {
            let timeLeft = COOLDOWN_PERIOD - (now - user.lastjobchange);
            let daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
            let hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            let minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            throw `⚠️ Anda telah mengganti pekerjaan baru-baru ini.\n\nSilakan tunggu *${daysLeft} hari, ${hoursLeft} jam, dan ${minutesLeft} menit* lagi sebelum bisa melamar pekerjaan baru.`;
        }
    }

    // Tampilan list job lengkap dengan syarat level dan info max gaji
    if (!text || !Object.keys(jobRequirements).includes(text.toLowerCase())) {
        let kerjaan = `乂 *B U R S A - K E R J A*

*Tingkat Pemula*
• Kurir (Min Lv. 5 | Max Gaji: Rp 3.000)
• Gojek (Min Lv. 10 | Max Gaji: Rp 4.000)
• Sopir (Min Lv. 15 | Max Gaji: Rp 5.000)
• Karyawan Indomaret (Min Lv. 20 | Max Gaji: Rp 6.000)

*Tingkat Menengah*
• Kantoran (Min Lv. 25 | Max Gaji: Rp 10.000)
• Polisi (Min Lv. 30 | Max Gaji: Rp 12.000)

*Spesialis IT*
• Frontend Developer (Min Lv. 40 | Max Gaji: Rp 15.000)
• Web Developer (Min Lv. 45 | Max Gaji: Rp 17.000)
• Backend Developer (Min Lv. 50 | Max Gaji: Rp 20.000)
• Game Developer (Min Lv. 55 | Max Gaji: Rp 22.000)
• Fullstack Developer (Min Lv. 60 | Max Gaji: Rp 25.000)

*Profesional Elit*
• Dokter (Min Lv. 70 | Max Gaji: Rp 30.000)
• Pemain Sepak Bola (Min Lv. 75 | Max Gaji: Rp 35.000)
• Trader (Min Lv. 80 | Max Gaji: Rp 40.000)

*Kelas Berbahaya (Underworld)*
• Pemburu Manusia (Min Lv. 90 | Max Gaji: Rp 45.000)
• Pembunuh Bayaran (Min Lv. 95 | Max Gaji: Rp 50.000)
• Hunter (Min Lv. 100 | Max Gaji: Rp 60.000)

💡 _Contoh Penggunaan_ :
${usedPrefix}${command} kantoran`.trim();
        conn.reply(m.chat, kerjaan, m);
        return;
    }

    let job = text.toLowerCase();
    let kapital = capitalizeFirstLetter(job);
    let jobLevelRange = jobRequirements[job];

    // Mencegah melamar pekerjaan yang sama jika sudah bekerja di sana
    if (user.job && user.job === job) {
        throw `Kamu saat ini sudah bekerja sebagai *${kapital}*!`;
    }

    // Memeriksa syarat level
    if (user.level < jobLevelRange.min || user.level > jobLevelRange.max) {
        throw `Maaf, level Anda belum mencukupi untuk menjadi *${kapital}*.\n\n📈 Level yang dibutuhkan: *${jobLevelRange.min}*\n👤 Level Anda saat ini: *${user.level}*`;
    }

    // Set flag agar pengguna tidak bisa spam command
    user.isApplying = true;

    // Pemberitahuan awal proses melamar
    let lamarkerja1 = `Kamu telah memasukkan berkas lamaran sebagai *${kapital}* 💼

⤷ _Tunggulah proses wawancara dan persetujuan dari HRD (sekitar 30 detik)..._`.trim();
    conn.reply(m.chat, lamarkerja1, m);

    // Proses penerimaan (Setelah 30 Detik)
    setTimeout(() => {
        let lamarkerja2 = `🎉 *S E L A M A T !* 🎉
        
Lamaran kerja kamu sebagai *${kapital}* telah **DITERIMA**! Kamu bisa mulai bekerja keras hari ini.

⤷ Ketik *${usedPrefix}jobkerja* untuk pergi bekerja dan mendapatkan gaji.`.trim();

        // Mengirim pesan bahwa diterima
        conn.reply(m.chat, lamarkerja2, m);

        // Update database pengguna
        user.job = job;
        user.lastjobchange = new Date() * 1; // Catat waktu untuk cooldown 3 hari
        user.isApplying = false; // Hapus flag pencegahan spam
    }, 30000); 
};

handler.help = ['lamarkerja'];
handler.tags = ['rpg'];
handler.command = /^(lamarkerja)$/i;

module.exports = handler;

// Fungsi kapitalisasi huruf pertama setiap kata
function capitalizeFirstLetter(str) {
    let words = str.split(" ");
    for (let i = 0; i < words.length; i++) {
        if (words[i]) { 
            words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
        }
    }
    return words.join(" ");
}