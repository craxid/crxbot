const fetch = require('node-fetch');

let handler = async (m, { conn, args }) => {
  if (!args[0]) throw 'Masukkan NIK!';
  let nik = args[0];
  let apiUrl = `https://api.siputzx.my.id/api/tools/nik-checker?nik=${nik}`;

  try {
      
        // Kirim pesan loading
  await conn.reply(m.chat, wait, m);
  await new Promise(resolve => setTimeout(resolve, 3000)); // jeda 3 detik

      
    let res = await fetch(apiUrl);
    let json = await res.json();
    if (json.status) {
      let data = json.data.data;
      let teks = `*Data KTP*\n\n`;
      teks += `*NIK:* ${nik}\n`;
      teks += `*Nama:* ${data.nama}\n`;
      teks += `*Jenis Kelamin:* ${data.kelamin}\n`;
      teks += `*Tempat Lahir:* ${data.tempat_lahir}\n`;
      teks += `*Usia:* ${data.usia}\n`;
      teks += `*Provinsi:* ${data.provinsi}\n`;
      teks += `*Kabupaten:* ${data.kabupaten}\n`;
      teks += `*Kecamatan:* ${data.kecamatan}\n`;
      teks += `*Kelurahan:* ${data.kelurahan}\n`;
      teks += `*Alamat:* ${data.alamat}\n`;
      teks += `*Zodiak:* ${data.zodiak}\n`;
      teks += `*Ultah Mendatang:* ${data.ultah_mendatang}\n`;
      teks += `*Pasaran:* ${data.pasaran}\n`;

      await m.reply(teks);
    } else {
      await m.reply('Gagal mengambil data KTP');
    }
  } catch (e) {
    console.error(e);
    throw `Ada yang eror nih`
  }
};

handler.command = handler.help = ['cekktp'];
handler.tags = ['tools'];
handler.premium = true;

module.exports = handler;