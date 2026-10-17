const fetch = require('node-fetch');
const uploadImage = require('../lib/uploadImage.js');

let handler = async (m, { conn, args, usedPrefix}) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  if (!mime) throw 'Fotonya mana?';
  if (!/image\/(jpe?g|png)/.test(mime)) throw `_*Mime ${mime} tidak didukung!*_`;

  let img = await q.download();
  let url = await uploadImage(img);

  let input = args.join(' ').split('|').map(i => i.trim());
  
  // Ubah batas validasi menjadi 17 karena ada 17 parameter yang dibutuhkan
  if (input.length < 17) {
    throw `Format salah!\n\nContoh:\n\n*${usedPrefix}ktp 3173072208180064|DKI JAKARTA|JAKARTA TIMUR|DEDE KURNIAWAN|Jakarta, 04-09-1999|Laki-laki|O|Jl. Jalan No. 01|004/003|Lurah|Camat|Islam|Belum Kawin|Pegawai Kantoran|WNI|Seumur Hidup|26-11-2025*`;
  }

  let [
    nik, provinsi, kota, nama, ttl, jenis_kelamin, gol_darah, alamat,
    rtrw, kel_desa, kecamatan, agama, status, pekerjaan,
    kewarganegaraan, masa_berlaku, terbuat
  ] = input;

  // Kirim pesan loading (pastikan variabel 'wait' sudah didefinisikan secara global di bot kamu)
  await conn.reply(m.chat, wait, m);
  await new Promise(resolve => setTimeout(resolve, 3000)); // jeda 3 detik

  // Menggunakan URLSearchParams agar parameter URL otomatis di-encode dengan benar
  const queryParams = new URLSearchParams({
    provinsi: provinsi,
    kota: kota,
    nik: nik,
    nama: nama,
    ttl: ttl,
    jenis_kelamin: jenis_kelamin,
    golongan_darah: gol_darah,
    alamat: alamat,
    'rt/rw': rtrw,       // Otomatis menjadi rt%2Frw
    'kel/desa': kel_desa, // Otomatis menjadi kel%2Fdesa
    kecamatan: kecamatan,
    agama: agama,
    status: status,
    pekerjaan: pekerjaan,
    kewarganegaraan: kewarganegaraan,
    masa_berlaku: masa_berlaku,
    terbuat: terbuat,
    pas_photo: url
  });

  // URL yang sudah diperbaiki sesuai Restapi
  let apiUrl = `https://api.siputzx.my.id/api/canvas/ektp?${queryParams.toString()}`;

  try {
    let res = await fetch(apiUrl);
    if (!res.ok) throw await res.text();
    let buffer = await res.buffer();
    await conn.sendFile(m.chat, buffer, 'ktp.jpg', '✅ Ini dia KTP-nya kak!', m);
  } catch (e) {
    console.error(e);
    throw `❌ Gagal membuat KTP. Pastikan format input benar dan server API aktif.\n\n${e}`;
  }
};

handler.help = ['ktp'];
handler.tags = ['maker'];
handler.command = /^ktp$/i;
handler.premium = true;

module.exports = handler;