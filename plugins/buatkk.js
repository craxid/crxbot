let handler = async (m, { conn, usedPrefix }) => {
    const text = m.text?.toLowerCase();

    // Data Wilayah Indonesia yang lebih lengkap
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

    const wilayah = wilayahData[Math.floor(Math.random() * wilayahData.length)];
    const kecamatan = getRandomKode(1, 12);

    if (text === `${usedPrefix}buatkk`) {
        const tglTerbit = getRandomTanggal();
        const urutan = (Math.floor(Math.random() * 800) + 1).toString().padStart(4, '0');
        const kk = `${wilayah.prov}${wilayah.kota}${kecamatan}${tglTerbit}${urutan}`;

        let caption = `*📊 GENERATOR KARTU KELUARGA*\n\n`;
        caption += `📝 *Nomor KK:* \`${kk}\`\n`;
        caption += `📍 *Provinsi:* ${wilayah.namaProv}\n`;
        caption += `🏙️ *Kota/Kab:* ${wilayah.namaKota}\n`;
        caption += `🏘️ *Kode Kec:* ${kecamatan}\n`;
        caption += `📅 *Tgl Terbit:* ${tglTerbit.slice(0,2)}-${tglTerbit.slice(2,4)}-20${tglTerbit.slice(4,6)}\n`;
        
        await conn.sendPresenceUpdate('recording', m.chat);
        setTimeout(() => m.reply(caption), 2000);
    }

    if (text === `${usedPrefix}buatktp`) {
        const jk = Math.random() < 0.5 ? 'Laki-laki' : 'Perempuan';
        const tglLahirRaw = getRandomTanggal();
        
        let tglKtp = tglLahirRaw.slice(0, 2);
        if (jk === 'Perempuan') {
            tglKtp = (parseInt(tglKtp) + 40).toString();
        }
        
        const urutan = (Math.floor(Math.random() * 800) + 1).toString().padStart(4, '0');
        const nik = `${wilayah.prov}${wilayah.kota}${kecamatan}${tglKtp}${tglLahirRaw.slice(2)}${urutan}`;

        let caption = `*🪪 GENERATOR KTP / NIK*\n\n`;
        caption += `📝 *Nomor NIK:* \`${nik}\`\n`;
        caption += `👤 *Jenis Kelamin:* ${jk}\n`;
        caption += `📍 *Provinsi:* ${wilayah.namaProv}\n`;
        caption += `🏙️ *Kota/Kab:* ${wilayah.namaKota}\n`;
        caption += `📅 *Tgl Lahir:* ${tglLahirRaw.slice(0,2)}-${tglLahirRaw.slice(2,4)}-19${tglLahirRaw.slice(4,6)}\n`;
        caption += `✨ *Status:* Terdaftar di Dukcapil`;

        await conn.sendPresenceUpdate('recording', m.chat);
        setTimeout(() => m.reply(caption), 3000);
    }
};

// --- Fungsi Pembantu ---
function getRandomKode(min, max) {
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString().padStart(2, '0');
}

function getRandomTanggal() {
    const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    // Tahun acak untuk usia dewasa (75 - 05)
    const yList = ['75', '80', '85', '90', '95', '00', '05'];
    const y = yList[Math.floor(Math.random() * yList.length)];
    return `${d}${m}${y}`;
}

handler.command = /^(buatkk|buatktp)$/i;
handler.register = true;
handler.premium = true;
module.exports = handler;
