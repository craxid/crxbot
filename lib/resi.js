// File: lib/resi.js

/**
 * Scraper Cek Resi JNE
 * Mengekstrak JSON dari object window.allTrackingData
 * 
 * @param {string} resi - Nomor Resi JNE
 * @param {string|number} verify - 5 angka terakhir nomor telepon penerima
 * @returns {Promise<Object>} Object response
 */
async function cekResiJNE(resi, verify) {
    try {
        // Menggunakan verify code asli dari parameter
        const url = `https://cekresi.jne.co.id/${resi}?verify=${verify}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://www.jne.co.id/'
            }
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const html = await response.text();

        // Regex untuk menangkap JSON di dalam window.allTrackingData = {...};
        const regex = /window\.allTrackingData\s*=\s*(\{.*?\});/s;
        const match = html.match(regex);

        if (match && match[1]) {
            const trackingData = JSON.parse(match[1]);
            
            // Mengecek apakah nomor resi yang diminta ada di dalam object
            if (trackingData[resi]) {
                return {
                    success: true,
                    data: trackingData[resi]
                };
            } else {
                return { 
                    success: false, 
                    message: 'Nomor resi tidak ditemukan, atau 5 angka terakhir nomor HP salah.' 
                };
            }
        } else {
            return { 
                success: false, 
                message: 'Gagal mengekstrak data dari server JNE.' 
            };
        }
    } catch (error) {
        return { 
            success: false, 
            message: `Terjadi kesalahan sistem: ${error.message}` 
        };
    }
}

module.exports = { cekResiJNE };