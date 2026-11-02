const axios = require("axios");
const cheerio = require("cheerio");
const { execFile } = require("child_process");

// short link tiktok/douyin yg harus di-resolve dulu, savetik nolak url beginian
const SHORT_DOMAINS = ["tt.site", "vm.tiktok.com", "vt.tiktok.com", "vm.douyin.com", "v.douyin.com"];

// ikutin redirect sampe dapet url tiktok/douyin aslinya
const resolveShortUrl = async (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const isShort = SHORT_DOMAINS.some((d) => host === d || host.endsWith("." + d));
    if (!isShort) return url; // url normal langsung lolos, gak usah request tambahan

    const res = await axios.get(url, {
      maxRedirects: 10,
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
      }
    });
    return res.request?.res?.responseUrl || url;
  } catch (e) {
    // gagal resolve ya udah, lempar url aslinya aja biar savetik yg nentuin
    return url;
  }
};

// Ambil durasi media (detik) langsung dari URL pakai ffprobe.
// ffprobe hanya membaca header file (bukan download full), jadi cepat.
// Syarat: ffmpeg/ffprobe terinstall di server (apt install ffmpeg).
// Return: number (detik) atau null kalau gagal.
const getDuration = (mediaUrl, timeoutMs = 15000) => {
  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mediaUrl],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve(null);
        const sec = parseFloat(String(stdout).trim());
        resolve(Number.isFinite(sec) && sec > 0 ? sec : null);
      }
    );
  });
};

// Format detik -> "m:ss" (atau "h:mm:ss" kalau >= 1 jam)
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const douyin = async (url) => {
  try {
    // beresin short url dulu biar savetik gak nolak
    url = await resolveShortUrl(url);

    const response = await axios.post("https://savetik.co/api/ajaxSearch", new URLSearchParams({ q: url }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Chrome/5.0 (Android 10; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    const html = response.data.data;
    const $ = cheerio.load(html);

    const title = $(".tik-left h3").text().trim();
    let duration = $(".tik-left p").text().trim();

    // Array untuk menampung link gambar (jika ada)
    const images = [];

    // Looping untuk mengambil setiap link download foto
    $(".download-box li").each((i, el) => {
      const imgUrl = $(el).find(".download-items__btn a").attr("href");
      if (imgUrl) images.push(imgUrl);
    });

    // Jika array images ada isinya, berarti ini adalah postingan slide foto
    const isImageOnly = images.length > 0;

    let videoUrl = null;
    let audioUrl = null;
    let thumbnail = null;

    if (isImageOnly) {
      // Ambil thumbnail dari div khusus image-tik
      thumbnail = $(".image-tik img").attr("src") || $(".thumbnail img").attr("src");

      // Pada mode slide, savetik menaruh link MP3 di atribut data-src tag video
      // Kita juga buat fallback mencari tombol "Download MP3"
      const rawAudio = $("video").attr("data-src");
      if (rawAudio && rawAudio.includes("mime_type=audio")) {
        audioUrl = rawAudio;
      } else {
        audioUrl = $("a.tik-button-dl").filter((i, el) => $(el).text().includes("Download MP3")).attr("href");
      }

      duration = "0:00"; // Paksa 0:00 karena slide tidak punya durasi pasti
    } else {
      // Logika untuk video TikTok biasa
      thumbnail = $("video").attr("poster");
      videoUrl = $("video").attr("data-src");

      // FIX: HTML savetik tidak memuat durasi video, jadi ukur langsung
      // dari file videonya pakai ffprobe. Hanya jalan kalau duration kosong.
      if (!duration && videoUrl) {
        const seconds = await getDuration(videoUrl);
        const formatted = formatDuration(seconds);
        if (formatted) duration = formatted;
      }
    }

    return {
      title,
      duration,
      thumbnail,
      isImageOnly,
      images, // Akan berisi array link gambar [ "url1", "url2", ... ]
      videoUrl, // null jika mode gambar
      audioUrl // Berisi link MP3 khusus untuk mode gambar (atau bisa diekspansi untuk video juga)
    };
  } catch (err) {
    console.error("Scraper Error:", err.message);
    return null;
  }
};

module.exports = { douyin };