const axios = require('axios');
const { fromBuffer } = require('file-type');

// Fungsi pembantu untuk menebak mimetype dari ekstensi jika fromBuffer gagal
const getMimeType = (ext) => {
  const mimeTypes = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 
    'webp': 'image/webp', 'gif': 'image/gif', 'mp4': 'video/mp4', 
    'mp3': 'audio/mpeg', 'm4a': 'audio/mp4', 'ogg': 'audio/ogg', 
    'wav': 'audio/wav', 'pdf': 'application/pdf', 'doc': 'application/msword', 
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel', 
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json',
    'zip': 'application/zip', 'rar': 'application/x-rar-compressed'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Upload file ke Google Drive via Google Apps Script
 * @param {Buffer} buffer File Buffer
 * @param {string} originalName Nama asli file (contoh: "gambar.jpg")
 * @returns {Promise<string>} URL publik file di Google Drive
 */
module.exports = async function (buffer, originalName = "file") {
  try {
    // 1. Coba deteksi tipe file murni dari buffer
    const fileType = await fromBuffer(buffer);
    
    let ext = '';
    let mime = '';

    // 2. Cek apakah ada ekstensi di nama file asli (misal: "video.mp4" -> "mp4")
    let nameExt = '';
    if (originalName.includes('.')) {
      nameExt = originalName.split('.').pop().toLowerCase();
    }

    // 3. Tentukan ekstensi dan mime-type yang paling akurat
    if (fileType) {
      ext = fileType.ext;
      mime = fileType.mime;
    } else if (nameExt) {
      // Jika buffer gagal dideteksi, tapi nama aslinya punya ekstensi, gunakan itu!
      ext = nameExt;
      mime = getMimeType(nameExt);
    } else {
      // Fallback terakhir jika tidak ada yang diketahui
      ext = 'bin';
      mime = 'application/octet-stream';
    }

    // 4. Pastikan nama file memiliki ekstensi yang benar
    let fileName = originalName;
    if (!nameExt) {
      // Jika nama aslinya cuma "file" tanpa titik, tambahkan ekstensi yang didapat
      fileName = `${originalName}.${ext}`;
    } else if (fileType && nameExt !== fileType.ext && ['bin', 'tmp'].includes(nameExt)) {
      // Memperbaiki kasus dimana nama terlanjur ".bin", padahal isinya ".jpg" atau ".mp4"
      fileName = originalName.replace(new RegExp(`\\.${nameExt}$`), `.${ext}`);
    }

    // 5. Ubah menjadi format Base64 yang siap dikirim
    const base64String = buffer.toString('base64');
    const base64Data = `data:${mime};base64,${base64String}`;

    // 6. Tembak ke URL Google Apps Script yang baru dengan limit tak terhingga
    const response = await axios.post('https://script.google.com/macros/s/AKfycbxxv4hPfKGVCEu09mDtpR-FjswfwGl578Oy_SaueUdbLfC9w__qdbnOFdr3g2DKrGUc/exec', {
      base64Data: base64Data,
      fileName: fileName
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      maxBodyLength: Infinity,    // Mengizinkan pengiriman data tanpa batas
      maxContentLength: Infinity  // Mengizinkan penerimaan data tanpa batas
    });

    // 7. Ambil dan kembalikan URL Google Drive-nya
    if (response.data && response.data.status === 'success') {
      return response.data.url;
    } else {
      throw new Error(response.data ? response.data.message : "Gagal upload ke GAS");
    }
  } catch (error) {
    throw error;
  }
};
