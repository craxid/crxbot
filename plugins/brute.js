const axios = require('axios');

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return await m.reply(`Sensei, perintahnya kurang lengkap! 🥺\n\nContoh penggunaan:\n${usedPrefix + command} <nomor hp>|<link target>|<jumlah pesan>\n\n*Contoh:* ${usedPrefix + command} 08xx-xxxx-xxxx|https://targetkamu.com|5`);
    }

    const [nohp, link, jumlahPesanStr] = text.split('|');
    const jumlahPesan = parseInt(jumlahPesanStr) || 1; // Default 1 pesan jika jumlah pesan tidak valid

    if (!nohp || !link) {
      return await m.reply(`Sensei, nomor HP dan link target harus diisi! 🥺\n\nContoh penggunaan:\n${usedPrefix + command} <nomor hp>|<link target>|<jumlah pesan>`);
    }

    if (isNaN(jumlahPesan) || jumlahPesan <= 0) {
      return await m.reply(`Jumlah pesan harus angka positif ya, Sensei! 🥺`);
    }

    const fetchData = async () => {
      try {
        const headers = {
          'sec-ch-ua-platform': 'windows',
          'referer': `${link}`,
          'sec-ch-ua-mobile': '?0',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Accept': 'text/plain, */*; q=0.01',
          'DNT': '1',
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'Cookie': 'PHPSESSID=032540a5bfd13e91858e01e30d73de6f',
        };

        const params = new URLSearchParams({
          nohp: `${nohp}`,
        });

        const response = await axios.post(`${link}`, params, { headers });
        console.log('Response Code:', response.status);
        console.log('Response Data:', response.data);
        return response;
      } catch (error) {
        console.error(error);
        throw error;
      }
    };

    await m.reply(`Misono mulai mengirim ${jumlahPesan} pesan ya, Sensei! 😉`);

    for (let i = 0; i < jumlahPesan; i++) {
      try {
        const response = await fetchData();
        if (response) {
          console.log(`Pesan ke-${i + 1} sukses dikirim! 🎉`);
          // Tidak perlu reply sukses setiap pesan, cukup di akhir atau jika ada error
        } else {
          console.log(`Pesan ke-${i + 1} gagal, tapi tidak ada response... 😥`);
        }
      } catch (error) {
        console.error(`Pesan ke-${i + 1} error:`, error);
        // Tidak perlu reply error setiap pesan, cukup di akhir atau jika ada error
      }
      // Jeda sebentar antar pesan biar tidak terlalu cepat (opsional)
      // await new Promise(resolve => setTimeout(resolve, 1000)); // Jeda 1 detik
    }

    await m.reply(`Selesai mengirim ${jumlahPesan} pesan, Sensei! 😉`);


  } catch (error) {
    console.error(error);
    await m.reply(`Aduh, error nih Sensei! 😖\n\n${error}`);
  }
}

handler.help = handler.command = ['brute <nomor hp>|<link target>|<jumlah pesan>'];
handler.tags = ['tools'];
handler.premium = true
handler.group = true

module.exports = handler;