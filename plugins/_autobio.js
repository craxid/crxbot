let lastBioUpdate = 0; // Waktu terakhir update bio (dalam ms)

module.exports = {
  before: async function all(m) {
    if (!global.autobio) return;

    const now = Date.now();
    // Interval minimal 5 menit (300.000 ms) agar aman dari silent rate-limit WA
    const THROTTLE_INTERVAL = 300000; 

    // Jika belum 5 menit sejak update terakhir, hentikan eksekusi
    if (now - lastBioUpdate < THROTTLE_INTERVAL) return;

    // Catat waktu update sekarang
    lastBioUpdate = now;

    let uptime = process.uptime() * 1000;
    // Konten teks dari versi Anda sebelumnya
    let bio = `🟢 Bot Aktif (GROUP ONLY) | Uptime: ${clockString(uptime)} | © crax.my.id`;

    try {
      await this.updateProfileStatus(bio);
      console.log('Bio diperbarui ke server WA:', bio);
    } catch (e) {
      // Penanganan Error Baileys v7 (@hapi/boom)
      const statusCode = e?.output?.statusCode;
      const isRateLimit = statusCode === 429 || (e?.message && String(e.message).includes('rate-overlimit'));

      if (isRateLimit) {
        console.warn('⚠️ Terlalu sering update bio (Rate Limit 429). Server WA menolak request.');
        // Penalti cooldown jika terkena limit agar tidak spam
        lastBioUpdate = now + THROTTLE_INTERVAL; 
      } else {
        console.error('❌ Gagal update bio:', e?.message || e);
      }
    }
  }
}

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}