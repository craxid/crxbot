/**
 * Lib Scraper J&T Express (CommonJS)
 * Endpoint situs resmi: https://www.jet.co.id/index/router/index.html (method query/findTrack)
 * Butuh 4 digit terakhir nomor telepon penerima/pengirim (verifikasi privasi J&T)
 */

const crypto = require('crypto');
const fetch = require('node-fetch'); // native fetch (undici) ke-block WAF J&T, pakai node-fetch

async function scrapeJNT(resi, phone4) {
  if (!resi) return { status: false, message: "Nomor resi wajib diisi." };
  if (!/^\d{4}$/.test(String(phone4 || ''))) {
    return { status: false, message: "4 digit terakhir nomor telepon wajib diisi." };
  }

  // pengganti fingerprint browser (Fingerprint2) yg dipakai situs resmi buat header signature
  const murmur = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHash('md5').update(murmur + 'j&t2020app!@#').digest('hex');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.jet.co.id/track',
    'X-SimplyPost-Id': murmur,
    'X-SimplyPost-Signature': sig
  };

  try {
    // situs resmi nyoba type 1-3 kalo hasil kosong, kita ikutin aja
    for (let type = 1; type <= 3; type++) {
      const params = new URLSearchParams({
        method: 'query/findTrack',
        'data[billcode]': String(resi).toUpperCase(),
        'data[lang]': 'en',
        'data[source]': '3',
        'data[phone]': String(phone4),
        'data[type]': String(type),
        pId: murmur,
        pst: sig
      });

      const response = await fetch('https://www.jet.co.id/index/router/index.html', {
        method: 'POST',
        headers: headers,
        body: params.toString()
      });

      const json = await response.json();

      if (json.code === 20000 && json.data && json.data.length > 0 &&
          json.data[0].details && json.data[0].details.length > 0) {

        const history = json.data[0].details.map(item => ({
          time: item.scanTime || "-",
          status: item.status || "-",
          location: item.scanNetworkName || "",
          city: item.scanNetworkCity || "",
          description: item.customerTracking || ""
        }));

        return {
          status: true,
          resi: String(resi).toUpperCase(),
          current_status: history[0].status,
          last_update: history[0].time,
          last_location: history[0].location,
          history: history
        };
      }
    }

    return { status: false, message: "Resi tidak ditemukan atau belum terdaftar di sistem J&T." };

  } catch (error) {
    console.error("[JNT Scraper Error]:", error);
    return { status: false, message: "Terjadi kesalahan sistem (Koneksi ditolak oleh J&T)." };
  }
}

module.exports = { scrapeJNT };