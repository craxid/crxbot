const { Sticker, StickerTypes } = require('wa-sticker-formatter');

/**
 * Membuat stiker dari berbagai jenis media dengan metadata kustom.
 * @param {Buffer|string} media Buffer media (gambar, video, GIF) atau URL media.
 * @param {object} options Opsi untuk stiker.
 * @param {string} [options.packname='Sticker'] Nama paket stiker.
 * @param {string} [options.author='CraXID Bot'] Nama pembuat stiker.
 * @param {boolean} [options.isAnimated=false] Apakah stiker akan menjadi animasi.
 * @param {string} [options.type=StickerTypes.FULL] Tipe stiker (FULL, CROP, ROUNDED, etc.).
 * @returns {Promise<Buffer>} Buffer dari stiker WebP yang sudah jadi.
 */
async function createSticker(media, options = {}) {
    const { 
        packname = 'Sticker', 
        author = 'CraXID Bot', 
        isAnimated = false,
        type = StickerTypes.FULL // Atau CROP, ROUNDED, dll.
    } = options;

    try {
        const sticker = new Sticker(media, {
            pack: packname,  // Nama paket
            author: author,  // Nama pembuat
            type: type,      // Tipe stiker (misal: 'full', 'crop', 'rounded')
            quality: 100,    // Kualitas gambar (0-100)
            animated: isAnimated, // Apakah stiker animasi
            // Jika Anda ingin mengontrol ukuran, durasi, dll untuk video/gif,
            // wa-sticker-formatter memiliki opsi seperti 'fps', 'startTime', 'endTime', 'width', 'height'
            // Contoh untuk video:
            // fps: 10,
            // startTime: '00:00:00.0',
            // endTime: '00:00:10.0', // Maksimal 10 detik
            // crop: true, // Untuk memastikan tidak ada padding jika aspek rasio beda
        });

        // Build sticker akan mengembalikan Buffer dari stiker WebP
        const stickerBuffer = await sticker.build();
        return stickerBuffer;

    } catch (e) {
        console.error('Error in createSticker function:', e);
        throw new Error(`Gagal membuat stiker: ${e.message || e}`);
    }
}

module.exports = { sticker: createSticker };