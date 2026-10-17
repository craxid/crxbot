const cooldown = 300000; // Cooldown default (5 menit dalam milidetik)
const cooldownAfterWork = 5 * 60 * 1000; // Cooldown setelah bekerja selama 5 menit (dalam milidetik)

let handler = async (m, { isPrems, conn, text, usedPrefix, command }) => {
    const user = global.db.data.users[m.sender];

    if (user.job === 'Pengangguran') {
        throw `Kamu belum mempunyai pekerjaan. Ketik *${usedPrefix}lamarkerja* untuk melamar pekerjaan`;
    }

    if (user.jail === true) {
        throw '*Kamu tidak bisa melakukan aktivitas karena masih dalam penjara!*';
    }
    if (user.culik === true) {
        throw '*Kamu tidak bisa melakukan aktivitas karena masih dalam sel penculik!*';
    }
        
    // Cek cooldown antara pekerjaan dan cooldown setelah bekerja selama 5 menit
    if (new Date() - user.pekerjaansatu < cooldown || user.pekerjaansatu + cooldownAfterWork > new Date()) {
        let remainingTime;
        if (new Date() - user.pekerjaansatu < cooldown) {
            remainingTime = user.pekerjaansatu + cooldown - new Date();
        } else {
            remainingTime = user.pekerjaansatu + cooldownAfterWork - new Date();
        }
        let formattedTime = new Date(remainingTime).toISOString().substr(11, 8);
        throw `Kamu sudah pergi bekerja sebelumnya. Tunggu selama *${formattedTime}* untuk bekerja lagi`;
    }

    // Skala Ekonomi Baru (Harga Limit = 1000)
    const jobList = {
        'kurir': [3000, 100, 3000],
        'gojek': [4000, 150, 4000],
        'sopir': [5000, 200, 5000],
        'karyawan indomaret': [6000, 250, 6000],
        'kantoran': [10000, 400, 10000],
        'polisi': [12000, 500, 12000],
        'frontend developer': [15000, 600, 15000],
        'web developer': [17000, 700, 17000],
        'backend developer': [20000, 800, 20000],
        'game developer': [22000, 900, 22000],
        'fullstack developer': [25000, 1000, 25000],
        'dokter': [30000, 1200, 30000],
        'pemain sepak bola': [35000, 1300, 35000],
        'trader': [40000, 800, 40000], 
        'pemburu manusia': [45000, 1500, 45000],        
        'pembunuh bayaran': [50000, 1600, 50000],    
        'hunter': [60000, 1800, 60000]
    };

    // Daftar pesan unik berdasarkan profesi
    const jobText = {
        'kurir': 'Panas-panasan mengantarkan puluhan paket COD hari ini, setidaknya tidak ada alamat yang nyasar.',
        'gojek': 'Setelah muter-muter cari alamat penumpang dan mengantar GoFood, kamu akhirnya bisa narik napas lega.',
        'sopir': 'Menyetir seharian menembus kemacetan kota bikin pinggang pegal, tapi bos sangat puas dengan pelayananmu.',
        'karyawan indomaret': '"Selamat datang di Indomaret, selamat belanja!" Tenggorokanmu kering mengucapkannya ratusan kali hari ini.',
        'kantoran': 'Tumpukan dokumen Excel dan meeting berjam-jam akhirnya selesai. Waktunya pulang dan rebahan!',
        'polisi': 'Kamu berhasil menilang beberapa pelanggar lalu lintas dan menangkap preman pasar hari ini. Kota aman berkatmu.',
        'frontend developer': 'Setelah pusing mengatur CSS dan memastikan UI responsif, website klien akhirnya rampung tanpa error.',
        'web developer': 'Website klien berhasil dirilis tepat sebelum deadline. Kopi habis bergelas-gelas, tapi usahamu terbayar.',
        'backend developer': 'Server berjalan mulus, API lancar, dan tidak ada database yang bocor hari ini. Mantap!',
        'game developer': 'Berhasil memperbaiki bug aneh yang bikin karakter nembus tembok. Game buatanmu semakin keren.',
        'fullstack developer': 'Ngerjain tampilan iya, ngurusin server juga iya. Matamu sudah mirip panda, tapi gajinya sepadan.',
        'dokter': 'Syukurlah, operasi hari ini berjalan lancar dan kamu berhasil menyelamatkan nyawa pasien yang kritis.',
        'pemain sepak bola': 'Permainan yang gemilang! Kamu mencetak gol indah dan membawa klubmu pada kemenangan telak.',
        'trader': 'Analisa teknikalmu hari ini sangat jitu! Grafik koin hijau semua dan kamu berhasil *take profit* besar-besaran.',
        'pemburu manusia': 'Target buronanmu berhasil ditangkap tanpa banyak perlawanan. Klien rahasia sangat puas.',
        'pembunuh bayaran': 'Kontrak selesai. Tidak ada jejak, tidak ada saksi. Uang darah telah ditransfer ke rekeningmu.',
        'hunter': 'Kamu baru saja keluar dari *Dungeon* setelah membantai bos monster dan membawa pulang banyak harta karun.'
    };

    if (jobList[user.job]) {
        let [moneyMax, expMax, bankMax] = jobList[user.job];
        
        let moneyMin = Math.floor(moneyMax * 0.2);
        let expMin = Math.floor(expMax * 0.2);

        let money = Math.floor(Math.random() * (moneyMax - moneyMin + 1)) + moneyMin;
        let exp = Math.floor(Math.random() * (expMax - expMin + 1)) + expMin;
        let bank = Math.floor(Math.random() * bankMax); 

        user.money += money;
        user.exp += exp;
        user.jobexp += 1;
        user.pekerjaansatu = new Date().getTime();

        // Mengambil pesan unik sesuai job. Jika tidak ada (error/typo), pakai teks default.
        let deskripsiKerja = jobText[user.job] || 'Kamu telah bekerja keras hari ini menyelesaian tugasmu.';

        // Pesan akhir yang dikirimkan ke pemain
        let message = `*💼 Laporan Pekerjaan: ${user.job.toUpperCase()}*\n\n_"${deskripsiKerja}"_\n\n*💰 Gajimu Hari Ini:*\n💵 *Money* : Rp. ${money.toLocaleString('id-ID')}\n✨ *Exp* : ${exp.toLocaleString('id-ID')}\n📈 *Tingkat Kerja Keras* : +1 🧟‍♂️`;

        conn.reply(m.chat, message, m);
    }
};
handler.help = ['jobkerja'];
handler.tags = ['rpg'];
handler.command = /^(jobkerja)$/i;

module.exports = handler;