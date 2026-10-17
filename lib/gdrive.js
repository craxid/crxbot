const axios = require('axios');

function format_ukuran(bytes) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const ukuran = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${ukuran[i]}`;
}

const link_gdrive = async (id_file) => {
    const url = `https://drive.google.com/uc?id=${id_file}&export=download`;

    try {
        const respon = await axios.get(url, {
            responseType: 'stream', // Bawaan Axios
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            validateStatus: () => true // Bawaan Axios
        });

        let tipe_konten = respon.headers['content-type'] || 'application/octet-stream';
        let disposisi = respon.headers['content-disposition'];
        
        // Ekstrak cookie dari header untuk sesi bypass
        let daftar_cookie = respon.headers['set-cookie'] || [];
        let teks_cookie = daftar_cookie.map(c => c.split(';')[0]).join('; ');

        let ukuran_bytes = 0;
        let url_langsung = url; 
        let nama_file = '';

        // Kasus 1: File Besar (Masuk ke halaman HTML Peringatan Virus atau Login)
        if (tipe_konten.includes('text/html') && (!disposisi || !disposisi.includes('attachment'))) {
            let data_html = '';
            for await (const potongan of respon.data) {
                data_html += potongan.toString();
            }

            // Cek apakah file diprivate (redirect ke halaman login akun Google)
            if (data_html.includes('ServiceLogin') || data_html.includes('accounts.google.com')) {
                throw new Error("File diprivate. Pastikan visibilitas link Google Drive diubah ke 'Siapa saja yang memiliki link'.");
            }

            // Gunakan banyak pola regex agar lebih kebal terhadap perubahan struktur HTML Google
            let token_konfirmasi = '';
            const pola_1 = data_html.match(/name="confirm"\s+value="([^"]+)"/i);
            const pola_2 = data_html.match(/confirm=([a-zA-Z0-9_-]+)/i);
            const pola_3 = data_html.match(/href="[^"]*?confirm=([^"&]+)[^"]*"/i);

            if (pola_1) {
                token_konfirmasi = pola_1[1];
            } else if (pola_2) {
                token_konfirmasi = pola_2[1];
            } else if (pola_3) {
                token_konfirmasi = pola_3[1];
            } else {
                token_konfirmasi = 't'; // Fallback token standar Google Drive
            }

            url_langsung = `https://drive.google.com/uc?id=${id_file}&export=download&confirm=${token_konfirmasi}`;

            // Request kedua untuk mengambil header file asli dengan token dan cookie
            const respon_header = await axios.get(url_langsung, { 
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Cookie': teks_cookie
                },
                validateStatus: () => true
            });
            
            ukuran_bytes = parseInt(respon_header.headers['content-length'] || '0');
            tipe_konten = respon_header.headers['content-type'] || 'application/octet-stream';
            disposisi = respon_header.headers['content-disposition'];
            
            // Perbarui cookie jika Google memberikan sesi baru
            if (respon_header.headers['set-cookie']) {
                teks_cookie = respon_header.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }
            
            respon_header.data.destroy(); 
        } else {
            // Kasus 2: File Kecil
            ukuran_bytes = parseInt(respon.headers['content-length'] || '0');
            respon.data.destroy(); 
        }

        // Ekstrak nama file asli
        if (disposisi) {
            const cocok = disposisi.match(/filename=["']?([^;"']+)/i);
            if (cocok) nama_file = cocok[1];
        } else {
            let ekstensi = '.bin';
            if (tipe_konten.includes('jpeg') || tipe_konten.includes('jpg')) ekstensi = '.jpg';
            else if (tipe_konten.includes('png')) ekstensi = '.png';
            else if (tipe_konten.includes('mp4')) ekstensi = '.mp4';
            else if (tipe_konten.includes('pdf')) ekstensi = '.pdf';
            else if (tipe_konten.includes('zip')) ekstensi = '.zip';
            else if (tipe_konten.includes('rar')) ekstensi = '.rar';
            else if (tipe_konten.includes('mojang')) ekstensi = '.mcworld'; 
            
            nama_file = `Gdrive_File_${id_file}${ekstensi}`;
        }

        return {
            file_name: nama_file,
            size_formatted: format_ukuran(ukuran_bytes),
            size_bytes: ukuran_bytes,
            mimetype: tipe_konten, 
            direct_download_url: url_langsung,
            cookie: teks_cookie 
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { link_gdrive };