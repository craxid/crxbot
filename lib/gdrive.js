const axios = require('axios');

function format_ukuran(bytes) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const ukuran = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${ukuran[i]}`;
}

// gabungin daftar set-cookie jadi satu header Cookie
function gabung_cookie(daftar) {
    return (daftar || []).map(c => c.split(';')[0]).join('; ');
}

// ambil nama file dari content-disposition, dukung filename* jg
function nama_dari_disposisi(disposisi) {
    if (!disposisi) return '';
    const bintang = disposisi.match(/filename\*=UTF-8''([^;]+)/i);
    if (bintang) {
        try { return decodeURIComponent(bintang[1]); } catch (e) { /* abaikan, coba pola biasa */ }
    }
    const biasa = disposisi.match(/filename=["']?([^;"']+)/i);
    return biasa ? biasa[1] : '';
}

const getLink = async (id_file) => {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const url_awal = `https://drive.google.com/uc?id=${id_file}&export=download`;

    try {
        // Request pertama: file kecil langsung keluar sbg attachment,
        // file besar mampir dulu ke halaman peringatan virus scan.
        const respon = await axios.get(url_awal, {
            responseType: 'stream',
            headers: { 'User-Agent': UA },
            validateStatus: () => true
        });

        let teks_cookie = gabung_cookie(respon.headers['set-cookie']);
        let tipe_konten = respon.headers['content-type'] || 'application/octet-stream';
        let disposisi = respon.headers['content-disposition'];
        let ukuran_bytes = 0;
        let url_langsung = url_awal;

        if (disposisi && disposisi.includes('attachment')) {
            // Kasus 1: langsung file, tinggal catat headernya
            ukuran_bytes = parseInt(respon.headers['content-length'] || '0');
            respon.data.destroy();
        } else if (tipe_konten.includes('text/html')) {
            // Kasus 2: halaman peringatan, baca HTML-nya
            let data_html = '';
            for await (const potongan of respon.data) {
                data_html += potongan.toString();
            }

            if (data_html.includes('ServiceLogin') || data_html.includes('accounts.google.com')) {
                throw new Error("File diprivate. Pastikan visibilitas link Google Drive diubah ke 'Siapa saja yang memiliki link'.");
            }

            // Alur Google sekarang: form di halaman peringatan disubmit ke
            // drive.usercontent.google.com, lengkap dgn uuid yg diganti tiap
            // request. Ambil semua field formnya apa adanya; cara lama yg
            // nebak token confirm di drive.google.com/uc udah ga jalan.
            const pola_form = data_html.match(/<form[^>]+action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i);
            if (pola_form) {
                const params = new URLSearchParams();
                for (const tag of pola_form[2].matchAll(/<input[^>]*>/gi)) {
                    const nm = tag[0].match(/name="([^"]+)"/i);
                    const vl = tag[0].match(/value="([^"]*)"/i);
                    if (nm) params.set(nm[1], vl ? vl[1] : '');
                }
                if (!params.get('id')) params.set('id', id_file);
                if (!params.get('export')) params.set('export', 'download');
                if (!params.get('confirm')) params.set('confirm', 't');
                url_langsung = `${pola_form[1].replace(/&amp;/g, '&')}?${params.toString()}`;
            } else {
                // cadangan terakhir: rakit sendiri dari uuid/confirm di HTML
                const cocok_uuid = data_html.match(/uuid=([0-9a-f-]{36})/i);
                const cocok_confirm = data_html.match(/confirm=([a-zA-Z0-9_-]+)/i);
                url_langsung = `https://drive.usercontent.google.com/download?id=${id_file}&export=download&confirm=${cocok_confirm ? cocok_confirm[1] : 't'}${cocok_uuid ? `&uuid=${cocok_uuid[1]}` : ''}`;
            }

            // Request kedua cuma buat baca header file aslinya
            const respon_header = await axios.get(url_langsung, {
                responseType: 'stream',
                headers: {
                    'User-Agent': UA,
                    'Cookie': teks_cookie
                },
                validateStatus: () => true
            });

            ukuran_bytes = parseInt(respon_header.headers['content-length'] || '0');
            tipe_konten = respon_header.headers['content-type'] || 'application/octet-stream';
            disposisi = respon_header.headers['content-disposition'];
            if (respon_header.headers['set-cookie']) {
                teks_cookie = gabung_cookie(respon_header.headers['set-cookie']);
            }
            respon_header.data.destroy();

            if (!disposisi || !disposisi.includes('attachment')) {
                throw new Error('Gagal melewati halaman peringatan Google Drive. File mungkin kena batas unduhan atau sudah dihapus.');
            }
        } else {
            respon.data.destroy();
            throw new Error('Respons Google Drive tidak dikenal (bukan file, bukan halaman peringatan).');
        }

        // Ekstrak nama file asli, kalo ga ada bikin nama cadangan dari tipe konten
        let nama_file = nama_dari_disposisi(disposisi);
        if (!nama_file) {
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

module.exports = { getLink };
