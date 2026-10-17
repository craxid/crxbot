// Handler command 'jadi' yang sudah diperbaiki desu! (^^)
// File: plugins/jadi.js atau lokasi handler bot プロデューサーさん
// Dibuat oleh Momoka Sakurai (CraXID Project) untuk プロデューサーさん (@⁨Dede Kurniawan⁩) ☆彡

const fetch = require('node-fetch'); // Untuk memanggil API desu!
const uploadImage = require('../lib/uploadImage'); // Asumsi ini modul untuk upload gambar プロデューサーさん

let handler = async (m, { conn, args, usedPrefix, command }) => { // Tambahkan usedPrefix dan command
  let q = m.quoted ? m.quoted : m; // Ambil pesan yang di-reply atau pesan saat ini
  let mime = (q.msg || q).mimetype || ''; // Ambil MIME type-nya

  // Cek apakah pesan itu gambar desu!
  if (!mime) {
    throw `*Foto tidak ditemukan* kamu harus mengirim atau reply gambar!`;
  }
  if (!/image\/(jpe?g|png)/.test(mime)) {
    throw `*Mime ${mime} tidak didukung* Mohon gunakan gambar format JPEG atau PNG ya!`;
  }

  // Ambil filter dari argumen pertama desu!
  const filter = args[0]?.toLowerCase(); // Ambil argumen pertama dan ubah jadi lowercase
  const validFilters = ['hitam', 'coklat', 'nerd', 'piggy', 'carbon', 'botak']; // Opsi filter yang tersedia

  // Cek apakah filter valid desu!
  if (!filter || !validFilters.includes(filter)) {
      let example = `${usedPrefix}${command} hitam`;
      let options = validFilters.map(opt => `- ${opt}`).join('\n');
      throw `*Format salah!* Mohon pilih opsi filter!\n\n*Contoh:* ${example}\n\nOpsi yang tersedia:\n${options}`;
  }

  try {
    // Unduh gambar dari pesan WhatsApp desu!
    let img = await q.download?.();
    if (!img) {
        throw new Error("Gagal mengunduh gambar dari pesan >_<");
    }

    // Unggah gambar ke server eksternal untuk mendapatkan link desu!
    await m.reply(wait || 'Mengunggah gambar... Mohon tunggu ya! ✨'); // Beri feedback ke user
    let link = await uploadImage(img); // Panggil fungsi uploadImage โปรดิวเซอร์さん
    if (!link) {
        throw new Error("Gagal mengunggah gambar untuk diproses! >_<");
    }

    //await m.reply(wait || `Memproses gambar dengan filter '${filter}'... ✨`); // Beri feedback lagi

    // Panggil API ryzendesu.vip desu!
    // URL API: https://api.ryzendesu.vip/api/ai/negro?url=<uploaded_image_url>&filter=<filter_name>
    let apiUrl = `https://api.ryzendesu.vip/api/ai/negro?url=${encodeURIComponent(link)}&filter=${encodeURIComponent(filter)}`;

    console.log(`[${command}] Memanggil API: ${apiUrl}`); // Log URL API yang dipanggil

    let res = await fetch(apiUrl); // Panggil API-nya desu!

    // Cek apakah API merespons dengan sukses (status 200-299) desu!
    if (!res.ok) {
        const errorText = await res.text().catch(() => 'Tidak bisa membaca pesan error dari API.');
        throw new Error(`API merespons error: ${res.status} ${res.statusText}\nPesan: ${errorText}`);
    }

    // Ambil data gambar dari body response sebagai buffer desu!
    // API ini kemungkinan mengirim data gambar langsung (binary)
    let imageBuffer = await res.buffer(); // <-- Ini cara ambil data binary dari fetch response desu!

    // Cek apakah buffer gambar kosong atau tidak valid
    if (!imageBuffer || imageBuffer.length === 0) {
         throw new Error("API tidak mengembalikan data gambar yang valid.");
    }


    // Kirim gambar yang sudah diolah kembali ke WhatsApp desu!
    console.log(`[${command}] Mengirim gambar hasil olahan filter '${filter}'.`);
    await conn.sendFile(m.chat, imageBuffer, 'processed_image.png', `Hasil filter '${filter}'! ✨\n\n${global.wm || ''}`, m); // Kirim buffer langsung!

  } catch (error) {
    // Tangani error yang terjadi desu!
    console.error(`[${command}] Terjadi error:`, error);
    let errorMessage = `Gagal mengolah gambar! >_<\n\n`;

    // Beri pesan error yang lebih spesifik jika memungkinkan
    if (error.message.startsWith("API merespons error")) {
        errorMessage += error.message; // Gunakan pesan error dari API
    } else if (error.message.startsWith("Gagal mengunduh gambar")) {
        errorMessage += error.message;
    } else if (error.message.startsWith("Gagal mengunggah gambar")) {
         errorMessage += error.message;
    } else if (error.message.startsWith("API tidak mengembalikan data gambar")) {
         errorMessage += error.message;
    }
    else {
        errorMessage += `Terjadi masalah teknis: ${error.message || error}`;
    }

    await m.reply(errorMessage); // Kirim pesan error ke user desu!
  }
};

handler.help = ['jadi <opsi>']; // Info bantuan desu
handler.tags = ['tools']; // Tag kategori desu
handler.command = /^jadi$/i; // Command yang dipicu (regex, case-insensitive)
handler.limit = true; // Aktifkan limit (jika bot mendukung fitur limit)

module.exports = handler; // Export handler-nya desu!