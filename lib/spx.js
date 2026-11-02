/**
 * Lib Scraper SPX (CommonJS)
 * Updated Version
 */

const crypto = require('crypto');

// cookie bawaan ini udah kepake lama & kebukti jalan buat resi reguler, biarin aja
const COOKIE_SPS = '_gcl_au=1.1.791283044.1786432072; _ga=GA1.1.1920054740.1786432072; _med=refer; app_source=nss; app_lang=id; _ga_3CRNHSSGVR=GS2.1.1786432071.1.0.1786432333.0.0.0';

const UA_HP = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36';

async function ambilOrderInfo(resi) {
  const url = `https://spx.co.id/shipment/order/open/order/get_order_info?spx_tn=${encodeURIComponent(resi)}&language_code=id`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': UA_HP,
      'Cookie': COOKIE_SPS
    }
  });
  return response.json();
}

// Jalur cadangan yg sama kayak yg dipake web resmi SPX: API fleet_order.
// Dipanggil pas jalur utama gagal, contohnya resi yg ketaut ke 2 order sekaligus
// (jalur utama langsung error "ref record not unique"). Parameternya ditandatangani:
// sha256(resi + timestamp detik + salt), formatnya <resi>|<timestamp><hash>.
const SALT_FLEET = 'MGViZmZmZTYzZDJhNDgxY2Y1N2ZlN2Q1ZWJkYzlmZDY=';

async function ambilFleet(resi) {
  const ts = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('sha256').update(resi + ts + SALT_FLEET).digest('hex');
  const url = `https://spx.co.id/api/v2/fleet_order/tracking/search?sls_tracking_number=${encodeURIComponent(`${resi}|${ts}${sign}`)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': UA_HP,
      'x-language': 'id'
    }
  });
  const data = await response.json();
  const list = data && data.data && Array.isArray(data.data.tracking_list) ? data.data.tracking_list : [];
  if (!list.length) return null;

  let history = list.map(item => ({
    time: new Date(item.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    // pesan fleet udah lengkap sama lokasi di dalam kurung, jadi location dikosongin aja
    status: item.message || item.status || "-",
    location: "",
    milestone: item.status || ""
  }));

  // buang status ganda yg nempel berurutan, sama kayak jalur utama
  history = history.filter((item, index, array) => index === 0 || item.status !== array[index - 1].status);

  return {
    status: true,
    resi: resi,
    sls_tn: data.data.sls_tracking_number || resi,
    order_id: "-",
    current_status: history[0].status,
    last_update: history[0].time,
    history: history
  };
}

async function cek(inputResi) {
  // rapihin dulu, kadang user ngetik pake spasi / huruf kecil
  const resi = String(inputResi || '').replace(/\s+/g, '').toUpperCase();

  try {
    const data = await ambilOrderInfo(resi);

    if (data.retcode !== 0 || !data.data || !data.data.sls_tracking_info) {
      // jalur utama gagal, coba jalur fleet dulu sebelum nyerah
      try {
        const viaFleet = await ambilFleet(resi);
        if (viaFleet) return viaFleet;
      } catch (e) {
        console.error("[SPX Fleet Error]:", e);
      }

      const pesanServer = String(data.message || '');

      // kasus spesial: resi ketaut ke 2 order sekaligus di sistem SPX (find [2] dst).
      // normalnya udah ketolong jalur fleet di atas; ini jaga-jaga aja kalo fleet ikutan gagal.
      // hati-hati: find [0] itu artinya resi ga ketemu, bukan duplikat.
      const ketemu = pesanServer.match(/find \[(\d+)\]/i);
      if (/not unique/i.test(pesanServer) && (!ketemu || parseInt(ketemu[1]) >= 2)) {
        return {
          status: false,
          duplicate: true,
          message: `Resi ini tertaut ke 2 order sekaligus di sistem SPX, jadi API publik SPX menolak menampilkannya. Lacak manual di web resmi SPX: https://spx.co.id/track?${resi}`
        };
      }

      // resi angka polos panjang itu biasanya SPX Instant, emang ga nongol di API reguler
      if (/not found/i.test(pesanServer) && /^\d{10,}$/.test(resi)) {
        return {
          status: false,
          message: 'Resi ini terdeteksi SPX Instant. Pelacakan SPX Instant hanya tersedia di aplikasi Shopee, tidak muncul di API publik SPX.'
        };
      }

      if (/not found/i.test(pesanServer) || (ketemu && parseInt(ketemu[1]) === 0)) {
        return { status: false, message: 'Resi tidak ditemukan di SPX. Cek lagi nomornya, atau paketnya mungkin belum diserahkan ke SPX.' };
      }

      return { status: false, message: 'Resi tidak valid atau belum terdaftar.' };
    }

    const trackingInfo = data.data.sls_tracking_info;
    const records = trackingInfo.records;

    if (!records || records.length === 0) {
      return { status: false, message: "Riwayat pelacakan belum tersedia untuk resi ini." };
    }

    // Mapping data dasar
    let history = records.map(item => {
      return {
        // Konversi Unix timestamp ke format lokal (WIB)
        time: new Date(item.actual_time * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        // Memprioritaskan buyer_description karena lebih user-friendly
        status: item.buyer_description || item.description || "-",
        location: item.current_location?.location_name || "",
        milestone: item.milestone_name || ""
      };
    });

    // Membersihkan riwayat duplikat yang berurutan dari API
    history = history.filter((item, index, array) => {
      if (index === 0) return true;
      // Membandingkan dengan status sebelumnya agar tidak ada pesan ganda
      return item.status !== array[index - 1].status;
    });

    return {
      status: true,
      resi: resi,
      sls_tn: trackingInfo.sls_tn || resi,          // Nomor Resi Logistic (SLS)
      order_id: trackingInfo.client_order_id || "-", // Nomor Pesanan Pembeli
      current_status: history[0].status,
      last_update: history[0].time,
      history: history
    };

  } catch (error) {
    console.error("[SPX Scraper Error]:", error);
    return { status: false, message: "Terjadi kesalahan sistem (Koneksi ditolak oleh SPX)." };
  }
}

module.exports = { cek };
