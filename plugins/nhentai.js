const NhentaiAPI = require('../lib/hentay');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const JSZip = require('jszip');
const PDFDocument = require('pdfkit');

// Inisialisasi menggunakan API Key dari global
const nhentai = new NhentaiAPI(global.nhentai);

// cache hasil search terakhir per chat, biar nomor urut (1-10) bisa di-resolve ke ID gallery asli
const lastSearch = new Map();

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const isDownload = ['nhdl', 'nhentaidl'].includes(command);

  // ==========================================
  // PENGATURAN HAPUS OTOMATIS (DINONAKTIFKAN)
  // ==========================================
  const DELAY_DELETE = 5 * 60 * 1000; // 5 Menit
  const autoDelete = (msg) => {
    // Bagian ini dikomentari agar pesan tidak dihapus otomatis
    /*
    if (msg && msg.key) {
      setTimeout(() => {
        conn.sendMessage(m.chat, { delete: msg.key }).catch(() => {});
      }, DELAY_DELETE);
    }
    */
  };

  autoDelete(m);

  // Pesan Loading Awal
  let processMsg = await conn.sendMessage(m.chat, { text: '⏳ *Memproses permintaanmu...*' }, { quoted: m });
  
  const editLoading = async (newText) => {
      if (processMsg && processMsg.key) {
          await conn.sendMessage(m.chat, { text: newText, edit: processMsg.key }).catch(() => {});
      }
  };

  if (!text) {
    let errMsg = `❌ Masukkan ID, link, atau kata kunci!\n\n*Info/Search:*\n${usedPrefix}nhentai gyaru\n\n*Download:*\n${usedPrefix}nhdl 40999 zip\n${usedPrefix}nhdl 40999 pdf`;
    await editLoading(errMsg);
    return autoDelete(processMsg);
  }

  try {
    // 1. Ekstraksi format (zip/pdf) jika ada, dan bersihkan teks
    const formatMatch = text.match(/\b(zip|pdf)\b/i);
    const format = formatMatch ? formatMatch[1].toLowerCase() : null;
    const cleanText = text.replace(/\b(zip|pdf)\b/gi, '').trim();

    // 2. Deteksi apakah input berupa ID (angka) atau URL
    const urlMatch = cleanText.match(/nhentai\.net\/g\/(\d+)/i);
    const isId = /^\d+$/.test(cleanText);
    let galleryId = urlMatch ? urlMatch[1] : null;
    if (!galleryId && isId) {
      // kalau user ketik nomor urut hasil search (1-10), resolve ke ID gallery aslinya
      const cached = lastSearch.get(m.chat) || [];
      const idx = parseInt(cleanText, 10);
      const hit = (idx >= 1 && idx <= cached.length) ? cached[idx - 1] : null;
      galleryId = hit ? String(hit.id) : cleanText; /* bukan nomor urut -> anggap ID langsung (fallback lama) */
    }

    // ==========================================
    // ALUR 1: JIKA INPUT ADALAH ID ATAU LINK
    // ==========================================
    if (galleryId) {
      await editLoading(`⏳ *Mengambil metadata untuk ID:* ${galleryId}...`);
      const data = await nhentai.getGallery(galleryId);
      
      const extMap = { 'j': 'jpg', 'p': 'png', 'w': 'webp', 'g': 'gif' };
      const coverExt = extMap[data.cover.t] || 'jpg';
      const coverUrl = `https://t.nhentai.net/galleries/${data.media_id}/cover.${coverExt}`;

      // --- EXTRACT TAGS & DETAILS ---
      const getTags = (type) => {
          if (!data.tags) return '-';
          const filtered = data.tags.filter(t => t.type === type).map(t => t.name);
          return filtered.length > 0 ? filtered.join(', ') : '-';
      };

      const tags = getTags('tag');
      const artists = getTags('artist');
      const languages = getTags('language');
      const categories = getTags('category');
      const characters = getTags('character');
      const parodies = getTags('parody');
      const groups = getTags('group');

      // --- FORMAT CAPTION LENGKAP ---
      let caption = `*📚 ${data.title.pretty || data.title.english || data.title.japanese}*\n\n`
          + `*🔖 ID:* ${data.id}\n`
          + `*👤 Artist:* ${artists}\n`
          + `*👥 Group:* ${groups}\n`
          + `*🎭 Parody:* ${parodies}\n`
          + `*🧩 Character:* ${characters}\n`
          + `*🏷️ Tags:* ${tags}\n`
          + `*🌐 Language:* ${languages}\n`
          + `*📁 Category:* ${categories}\n`
          + `*📄 Pages:* ${data.num_pages}\n`
          + `*🔗 Link:* https://nhentai.net/g/${data.id}/\n`;

      // --- ALUR DOWNLOAD ---
      if (isDownload) {
        if (!format) {
            let offerMsg = `📦 *Mau dikirim dalam bentuk apa?*\n\nSilakan balas atau ketik ulang perintah dengan menambahkan *zip* atau *pdf* di akhir.\n\n*Contoh:*\n👉 ${usedPrefix}nhdl ${galleryId} zip\n👉 ${usedPrefix}nhdl ${galleryId} pdf`;
            await editLoading(offerMsg);
            return autoDelete(processMsg);
        }

        const outputDir = './tmp';
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        await editLoading(`⏳ *Sedang mengunduh dari server nhentai...*\n_Mohon tunggu, ini mungkin memakan waktu._`);
        
        let infoMsg = await safeSendMedia(m, conn, coverUrl, caption);
        autoDelete(infoMsg);

        // Download as ZIP dari API
        const zipFilePath = await nhentai.downloadGallery(galleryId, outputDir, 'zip');
        let finalFilePath = zipFilePath;
        let mimeType = 'application/zip';

        // Konversi ke PDF jika diminta
        if (format === 'pdf') {
            await editLoading(`⚙️ *Membuat PDF dari ${data.num_pages} halaman...*\n_Sedang merakit gambar, mohon bersabar!_`);
            
            const zipBuffer = fs.readFileSync(zipFilePath);
            const zip = await JSZip.loadAsync(zipBuffer);
            
            let imageFiles = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && relativePath.match(/\.(jpg|jpeg|png)$/i)) {
                    imageFiles.push(zipEntry);
                }
            });

            imageFiles.sort((a, b) => {
                const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            finalFilePath = path.join(outputDir, `${galleryId}.pdf`);
            const doc = new PDFDocument({ autoFirstPage: false });
            const writeStream = fs.createWriteStream(finalFilePath);
            doc.pipe(writeStream);

            for (const file of imageFiles) {
                const imgBuffer = await file.async("nodebuffer");
                doc.addPage();
                try {
                    doc.image(imgBuffer, 0, 0, {
                        fit: [doc.page.width, doc.page.height],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (e) {
                    console.log(`Gagal memuat gambar ${file.name}`, e);
                }
            }
            doc.end();

            await new Promise((resolve) => writeStream.on('finish', resolve));
            fs.unlinkSync(zipFilePath); // Hapus ZIP
            mimeType = 'application/pdf';
        }

        await editLoading(`🚀 *File ${format.toUpperCase()} siap!*\n_Sedang mengirim dokumen..._`);

        let thumbBuffer;
        try {
            const thumbUrl = `https://t.nhentai.net/galleries/${data.media_id}/thumb.${extMap[data.thumbnail.t] || 'jpg'}`;
            const imgRes = await fetch(thumbUrl);
            const originalBuffer = Buffer.from(await imgRes.arrayBuffer());
            const image = await Jimp.read(originalBuffer);
            image.contain(320, 180, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
            image.quality(60);
            thumbBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        } catch (e) {}

        let docMsg = await conn.sendMessage(m.chat, { 
            document: { url: finalFilePath }, 
            mimetype: mimeType, 
            fileName: `${data.title?.pretty || data.id}.${format}`,
            jpegThumbnail: thumbBuffer
        }, { quoted: infoMsg });
        
        autoDelete(docMsg);
        fs.unlinkSync(finalFilePath);
        
        await editLoading(`✅ *Proses Selesai!*\nFile ${format.toUpperCase()} berhasil dikirim.`);
        
        // Timeout delete pesan proses dikomentari
        /*
        setTimeout(() => {
            conn.sendMessage(m.chat, { delete: processMsg.key }).catch(() => {});
        }, 10000);
        */

      // --- ALUR INFO DETAIL (Bukan Download) ---
      } else {
        caption += `\n*💡 Tip:* Ketik *${usedPrefix}nhdl ${data.id} zip* atau *${usedPrefix}nhdl ${data.id} pdf* untuk mengunduh.`;
        let infoMsg = await safeSendMedia(m, conn, coverUrl, caption);
        autoDelete(infoMsg);
        
        // Delete pesan proses dikomentari
        // conn.sendMessage(m.chat, { delete: processMsg.key }).catch(() => {});
      }

    // ==========================================
    // ALUR 2: JIKA INPUT ADALAH TEKS/PENCARIAN
    // ==========================================
    } else {
      await editLoading(`🔍 *Mencari:* ${cleanText}...`);
      
      const searchData = await nhentai.search(cleanText, 1, 'popular');

      if (!searchData.result || searchData.result.length === 0) {
          await editLoading(`❌ Tidak ditemukan hasil untuk kata kunci: *${cleanText}*`);
          return autoDelete(processMsg);
      }

      let results = searchData.result.slice(0, 10);
      lastSearch.set(m.chat, results); /* ingat hasil ini buat resolve nomor urut */
      let searchResultTxt = `🔍 *Hasil Pencarian: ${cleanText}*\n\n`;
      
      results.forEach((r, i) => {
         // --- PERBAIKAN: Fallback judul yang aman untuk search API ---
         let mangaTitle = r.english_title || (r.title && (r.title.english || r.title.pretty)) || 'Judul tidak diketahui';
         
         searchResultTxt += `*${i + 1}. ${mangaTitle}*\n`;
         searchResultTxt += `🔖 *ID:* ${r.id} | 📄 *Pages:* ${r.num_pages}\n`;
         searchResultTxt += `🔗 https://nhentai.net/g/${r.id}/\n\n`;
      });
      searchResultTxt += `*Ketik:* ${usedPrefix}nhentai <ID> untuk info, atau ${usedPrefix}nhdl <ID> <zip/pdf> untuk download.`;
      
      await editLoading(searchResultTxt);
      autoDelete(processMsg);
    }

  } catch (err) {
    console.error(err);
    let errorTxt = `❌ Terjadi kesalahan:\n${err.message}`;
    if (err.message.includes('404')) errorTxt = `❌ Manga tidak ditemukan. Pastikan ID benar.`;
    
    await editLoading(errorTxt);
    autoDelete(processMsg);
  }
};

async function safeSendMedia(m, conn, img, txt) {
  try {
    return await conn.sendMessage(m.chat, { image: { url: img }, caption: txt }, { quoted: m });
  } catch (e) {
    return await conn.sendMessage(m.chat, { text: txt }, { quoted: m });
  }
}

handler.command = ['nhentai', 'nh', 'nhdl', 'nhentaidl'];
handler.help = ['nhentai <id / search>', 'nhdl <id> <zip/pdf>'];
handler.tags = ['nsfw'];
handler.premium = true;

module.exports = handler;
