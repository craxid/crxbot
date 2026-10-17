let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Memastikan user memasukkan argumen NIK
    if (!args[0]) {
        return m.reply(`⚠️ Masukkan nomor NIK yang ingin dicek!\n\n*Contoh penggunaan:*\n${usedPrefix}${command} 3273010101900001`);
    }

    const nik = args[0];

    // Validasi panjang dan format NIK (harus 16 digit angka)
    if (nik.length !== 16 || isNaN(nik)) {
        return m.reply('❌ NIK tidak valid! Pastikan NIK berjumlah tepat 16 digit angka.');
    }

    // Variabel pesan tunggu dengan emoji jam pasir
    // const wait = '⏳ _Sedang memproses data, mohon tunggu sebentar..._';
    
    // Mengirim pesan tunggu
    await m.reply(wait);

    // Data Wilayah (Bisa Anda kembangkan lagi ke database yang lebih lengkap)
    const wilayahData = [
        { prov: '11', kota: '01', namaProv: 'Aceh', namaKota: 'Kab. Aceh Besar' },
        { prov: '12', kota: '71', namaProv: 'Sumatera Utara', namaKota: 'Kota Medan' },
        { prov: '13', kota: '71', namaProv: 'Sumatera Barat', namaKota: 'Kota Padang' },
        { prov: '14', kota: '71', namaProv: 'Riau', namaKota: 'Kota Pekanbaru' },
        { prov: '15', kota: '71', namaProv: 'Jambi', namaKota: 'Kota Jambi' },
        { prov: '16', kota: '71', namaProv: 'Sumatera Selatan', namaKota: 'Kota Palembang' },
        { prov: '17', kota: '71', namaProv: 'Bengkulu', namaKota: 'Kota Bengkulu' },
        { prov: '18', kota: '71', namaProv: 'Lampung', namaKota: 'Kota Bandar Lampung' },
        { prov: '19', kota: '71', namaProv: 'Kep. Bangka Belitung', namaKota: 'Kota Pangkal Pinang' },
        { prov: '21', kota: '71', namaProv: 'Kepulauan Riau', namaKota: 'Kota Tanjung Pinang' },
        { prov: '31', kota: '71', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Pusat' },
        { prov: '31', kota: '72', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Utara' },
        { prov: '31', kota: '73', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Pusat' },
        { prov: '31', kota: '74', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Barat' },
        { prov: '31', kota: '75', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Selatan' },
        { prov: '31', kota: '76', namaProv: 'DKI Jakarta', namaKota: 'Jakarta Timur' },
        { prov: '32', kota: '73', namaProv: 'Jawa Barat', namaKota: 'Kota Bandung' },
        { prov: '32', kota: '75', namaProv: 'Jawa Barat', namaKota: 'Kota Bekasi' },
        { prov: '32', kota: '76', namaProv: 'Jawa Barat', namaKota: 'Kota Depok' },
        { prov: '33', kota: '74', namaProv: 'Jawa Tengah', namaKota: 'Kota Semarang' },
        { prov: '33', kota: '72', namaProv: 'Jawa Tengah', namaKota: 'Kota Surakarta' },
        { prov: '34', kota: '71', namaProv: 'DI Yogyakarta', namaKota: 'Kota Yogyakarta' },
        { prov: '35', kota: '78', namaProv: 'Jawa Timur', namaKota: 'Kota Surabaya' },
        { prov: '35', kota: '73', namaProv: 'Jawa Timur', namaKota: 'Kota Malang' },
        { prov: '36', kota: '71', namaProv: 'Banten', namaKota: 'Kota Tangerang' },
        { prov: '51', kota: '71', namaProv: 'Bali', namaKota: 'Kota Denpasar' },
        { prov: '52', kota: '71', namaProv: 'Nusa Tenggara Barat', namaKota: 'Kota Mataram' },
        { prov: '53', kota: '71', namaProv: 'Nusa Tenggara Timur', namaKota: 'Kota Kupang' },
        { prov: '61', kota: '71', namaProv: 'Kalimantan Barat', namaKota: 'Kota Pontianak' },
        { prov: '62', kota: '71', namaProv: 'Kalimantan Tengah', namaKota: 'Kota Palangkaraya' },
        { prov: '63', kota: '71', namaProv: 'Kalimantan Selatan', namaKota: 'Kota Banjarmasin' },
        { prov: '64', kota: '71', namaProv: 'Kalimantan Timur', namaKota: 'Kota Samarinda' },
        { prov: '71', kota: '71', namaProv: 'Sulawesi Utara', namaKota: 'Kota Manado' },
        { prov: '72', kota: '71', namaProv: 'Sulawesi Tengah', namaKota: 'Kota Palu' },
        { prov: '73', kota: '71', namaProv: 'Sulawesi Selatan', namaKota: 'Kota Makassar' },
        { prov: '74', kota: '71', namaProv: 'Sulawesi Tenggara', namaKota: 'Kota Kendari' },
        { prov: '81', kota: '71', namaProv: 'Maluku', namaKota: 'Kota Ambon' },
        { prov: '91', kota: '71', namaProv: 'Papua', namaKota: 'Kota Jayapura' }
    ];

    // Memecah digit NIK
    const kodeProv = nik.slice(0, 2);
    const kodeKota = nik.slice(2, 4);
    const kodeKec = nik.slice(4, 6);
    const tglLahirRaw = parseInt(nik.slice(6, 8));
    const bulanLahir = nik.slice(8, 10);
    const tahunLahirRaw = nik.slice(10, 12);
    const noUrut = nik.slice(12, 16);

    // Menentukan Jenis Kelamin dan Tanggal Lahir Asli
    let jenisKelamin = 'Laki-laki';
    let tglLahir = tglLahirRaw;

    if (tglLahirRaw > 40) {
        jenisKelamin = 'Perempuan';
        tglLahir = tglLahirRaw - 40; // Rumus KTP: Tanggal lahir perempuan + 40
    }

    // Format Tanggal dengan leading zero jika perlu
    const tglFormat = tglLahir.toString().padStart(2, '0');

    // Menentukan Abad Kelahiran (Asumsi dasar: Jika tahun di atas tahun saat ini, berarti kelahiran 19xx)
    const tahunSaatIni = parseInt(new Date().getFullYear().toString().slice(-2));
    const prefixTahun = parseInt(tahunLahirRaw) > tahunSaatIni ? '19' : '20';
    const tahunLahir = `${prefixTahun}${tahunLahirRaw}`;

    // Mencari data wilayah
    const area = wilayahData.find(w => w.prov === kodeProv && w.kota === kodeKota);
    const namaProv = area ? area.namaProv : 'Tidak terdaftar di database lokal';
    const namaKota = area ? area.namaKota : 'Tidak terdaftar di database lokal';

    // Menyusun Pesan Balasan
    let caption = `*🔍 PARSING DATA NIK*\n\n`;
    caption += `📝 *NIK:* \`${nik}\`\n`;
    caption += `👤 *Jenis Kelamin:* ${jenisKelamin}\n`;
    caption += `📅 *Tanggal Lahir:* ${tglFormat}-${bulanLahir}-${tahunLahir}\n`;
    caption += `📍 *Provinsi:* ${namaProv} (${kodeProv})\n`;
    caption += `🏙️ *Kota/Kab:* ${namaKota} (${kodeKota})\n`;
    caption += `🏘️ *Kode Kec:* ${kodeKec}\n`;
    caption += `🔢 *Nomor Urut:* ${noUrut}\n`;

    await conn.sendPresenceUpdate('composing', m.chat);
    
    // Memberikan sedikit jeda sebelum mengirim hasil agar natural
    setTimeout(() => conn.sendMessage(m.chat, { text: caption }, { quoted: m }), 1500); 
};

handler.command = /^(ceknik|parsingnik|infonik)$/i;
handler.help = ['ceknik <nik>'];
handler.tags = ['tools'];
handler.register = true;
handler.limit = true;

module.exports = handler;