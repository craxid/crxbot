/**
 * Lib Scraper SPX (CommonJS)
 * Updated Version
 */

async function scrapeSPX(resi) {
  const url = `https://spx.co.id/shipment/order/open/order/get_order_info?spx_tn=${resi}&language_code=id`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        'Cookie': '_gcl_au=1.1.791283044.1786432072; _ga=GA1.1.1920054740.1786432072; _med=refer; app_source=nss; app_lang=id; _ga_3CRNHSSGVR=GS2.1.1786432071.1.0.1786432333.0.0.0'
      }
    });

    const data = await response.json();

    // Validasi respons JSON
    if (data.retcode !== 0 || !data.data || !data.data.sls_tracking_info) {
      return { 
        status: false, 
        message: data.message || "Resi tidak valid atau belum terdaftar." 
      };
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

module.exports = { scrapeSPX };