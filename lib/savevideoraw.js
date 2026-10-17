const axios = require("axios");
const fs = require("fs");

const BASE = "https://savevideoraw.com";

/**
 * Mendeteksi platform berdasarkan URL yang diberikan.
 * @param {string} url - URL video/audio
 * @returns {string} Nama platform (tiktok, douyin, instagram, dll)
 */
const detectPlatform = (url) => {
  const u = url.toLowerCase();
  if (u.includes("jimeng.jianying.com") || u.includes("jimeng.com")) return "jimeng";
  if (u.includes("dreamina.capcut.com") || u.includes("dreamina.com")) return "dreamina";
  if (u.includes("doubao.com")) return "doubao";
  if (u.includes("dola.com")) return "dola";
  if (u.includes("xiaoyunque.jianying.com")) return "pippit";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok")) return "tiktok";
  if (u.includes("douyin.com") || u.includes("v.douyin")) return "douyin";
  if (u.includes("xiaohongshu.com") || u.includes("xhslink.com") || u.includes("xhs.cn")) return "xiaohongshu";
  if (u.includes("kuaishou.com") || u.includes("kwai.com")) return "kuaishou";
  if (u.includes("snackvideo.com")) return "snackvideo";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("threads.net")) return "threads";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("googleusercontent.com/spotify.com") || u.includes("open.spotify")) return "spotify";
  if (u.includes("soundcloud.com") || u.includes("snd.sc")) return "soundcloud";
  if (u.includes("pipix.com") || u.includes("pipixia.com") || u.includes("h5.pipix.com") || u.includes("s.pipix.com")) return "pipixia";
  if (u.includes("qianwen.com")) return "qianwen";
  return "auto";
};

/**
 * Mengambil metadata dan link download dari URL.
 * @param {string} url - URL dari video/sosmed
 * @param {string} [platform] - (Opsional) Nama platform jika ingin bypass auto-detect
 * @returns {Promise<Object>} Object berisi data video/audio
 */
const savevideoraw = async (url, platform) => {
  const p = platform || detectPlatform(url);

  try {
    if (p === "jimeng") {
      const resp = await axios.post(`${BASE}/apij.php`, { text: url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success) return { error: d.error || "Failed", url };
      const qualities = d.qualities || (d.data || []).map(v => ({ url: v.url, label: v.is_clean ? "Origin (No Watermark)" : "Standard", quality: v.is_clean ? "origin" : "standard" }));
      return { title: "Jimeng Video", thumbnail: d.cover_url || null, itemId: d.item_id || null, qualities, platform: "jimeng" };
    }

    if (p === "dreamina") {
      const resp = await axios.post(`${BASE}/apidreamina.php`, { text: url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success) return { error: d.error || "Failed", url };
      const qualities = d.qualities || d.data || [];
      const noWm = qualities.filter(q => q.is_clean !== false && !String(q.logo_type || "").includes("watermark"));
      return { title: d.creator ? `Dreamina - @${d.creator}` : "Dreamina Video", thumbnail: d.cover_url || null, duration: d.duration_ms ? Math.round(d.duration_ms / 1000) + "s" : null, videoUrl: noWm[0]?.url || qualities[0]?.url || null, qualities: qualities.map(q => ({ url: q.url || q.video_url, label: q.label || q.quality || "Video", isClean: q.is_clean !== false })), platform: "dreamina" };
    }

    if (p === "doubao") {
      const resp = await axios.post(`${BASE}/apidoubao2.php`, { shareUrl: url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success) return { error: d.error || "Failed", url };
      let videoData = d;
      if (d.select_required && d.videos?.length > 0) videoData = { ...d, stream_url: d.videos[0].stream_url || d.raw_url };
      return { title: videoData.title || "Doubao Video", thumbnail: videoData.thumbnail || null, streamUrl: videoData.stream_url || videoData.raw_url || null, filename: videoData.filename || "doubao.mp4", platform: "doubao" };
    }

    if (p === "dola") {
      const resp = await axios.post(`${BASE}/apidola.php`, { url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success || !d.job_id) return { error: d.error || "Failed", url };
      return { jobId: d.job_id, title: d.video?.title || "Dola Video", platform: "dola" };
    }

    if (p === "pippit") {
      const resp = await axios.post(`${BASE}/api_pippit.php`, { text: url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success || !d.job_id) return { error: d.error || "Failed", url };
      return { jobId: d.job_id, title: d.video_info?.title || "Pippit Video", thumbnail: d.video_info?.cover_url || null, platform: "pippit" };
    }

    if (p === "pipixia") {
      const resp = await axios.get(`${BASE}/pipixia_api.php?action=parse&url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (d.status !== "success" && d.success !== true) return { error: d.message || d.error || "Failed", url };
      const info = d.data || d;
      return { title: info.title || "Pipixia Video", thumbnail: info.cover_url || null, videoUrl: info.video_url || null, itemId: info.item_id || null, platform: "pipixia" };
    }

    if (p === "qianwen") {
      const resp = await axios.post(`${BASE}/apiqianwen.php`, { shareUrl: url }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 30000 });
      const d = resp.data;
      if (!d.success) return { error: d.error || "Failed", url };
      return { title: d.title || "Qianwen Video", thumbnail: d.thumbnail || null, streamUrl: d.stream_url || null, filename: d.filename || "qianwen.mp4", platform: "qianwen" };
    }

    // Generic / apiall (TikTok, Douyin, XHS, dll)
    const resp = await axios.post(`${BASE}/apiall.php`, { url, platform: p }, { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" }, timeout: 30000 });
    const data = resp.data;
    if (!data.success) return { error: data.error || "No content found", url };

    if (p === "tiktok" || p === "auto") {
      const downloads = data.downloads || [];
      const noWm = downloads.filter(d => d.text?.toLowerCase().includes("no watermark"));
      const withWm = downloads.filter(d => d.text?.toLowerCase().includes("with watermark") && !d.text?.toLowerCase().includes("no watermark"));
      const audio = downloads.filter(d => d.text?.toLowerCase().includes("audio") || d.text?.toLowerCase().includes("mp3"));
      const firstVideo = downloads.find(d => !d.is_image && !d.text?.toLowerCase().includes("audio"));
      return { title: data.video_info?.title || data.title || "TikTok Video", author: data.video_info?.author || null, thumbnail: data.video_info?.thumbnail || data.thumb || null, videoNoWm: noWm[0]?.url || firstVideo?.url || null, videoWithWm: withWm[0]?.url || null, audio: audio[0]?.url || null, downloads, platform: "tiktok" };
    }

    return { title: data.title || p, thumbnail: data.thumb || null, videos: data.videos || [], audios: data.audios || [], platform: p };

  } catch (err) {
    return { error: `Scraper Error: ${err.message}`, url };
  }
};

/**
 * Ekstrak link video terbaik dari hasil response savevideoraw
 * @param {Object} r - Response dari fungsi savevideoraw
 * @returns {Object|null} Object berisi {url, filename}
 */
const getVideoUrl = (r) => {
  if (r.error) return null;
  if (r.qualities?.length) return { url: r.qualities[0].url, filename: `${r.platform}_${r.itemId || Date.now()}.mp4` };
  if (r.videoNoWm) return { url: r.videoNoWm, filename: `${r.platform}_${Date.now()}.mp4` };
  if (r.streamUrl) return { url: r.streamUrl, filename: r.filename || `${r.platform}_${Date.now()}.mp4` };
  if (r.videoUrl) return { url: r.videoUrl, filename: `${r.platform}_${Date.now()}.mp4` };
  if (r.videos?.length) return { url: r.videos[0].url || r.videos[0], filename: `${r.platform}_${Date.now()}.mp4` };
  return null;
};

/**
 * Mengunduh file media ke dalam local storage.
 * @param {string} url - Link direct media
 * @param {string} filename - Nama file output
 * @returns {Promise<Object>} Info ukuran dan nama file
 */
const download = async (url, filename) => {
  try {
    const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 120000, headers: { "User-Agent": "Mozilla/5.0" } });
    fs.writeFileSync(filename, resp.data);
    return { size: resp.data.length, filename };
  } catch (err) {
    throw new Error(`Download Failed: ${err.message}`);
  }
};

// ── CLI Mode ─────────────────────────────────────────────────────────
const cli = async () => {
  const url = process.argv[2];
  if (!url) return console.log("Usage: node lib/savevideoraw.js <url>\nExample: node lib/savevideoraw.js https://tiktok.com/@user/video/123");

  console.log(`[+] Fetching data from: ${url}`);
  const r = await savevideoraw(url);
  
  if (r.error) return console.log("[-] Error:", r.error);

  console.log(`\n[+] Title: ${r.title || r.platform}`);
  console.log(`[+] Platform: ${r.platform}`);

  const video = getVideoUrl(r);
  if (!video) return console.log("[-] No video URL found.\nFull response:", JSON.stringify(r, null, 2));

  console.log(`[+] Downloading: ${video.url.substring(0, 60)}...`);

  try {
    const result = await download(video.url, video.filename);
    console.log(`\n[✓] Saved successfully: ${result.filename} (${(result.size / 1048576).toFixed(2)} MB)`);
  } catch (e) {
    console.log(`\n[-] Gagal mengunduh: ${e.message}`);
  }
};

// Eksekusi jika file dipanggil langsung via terminal
if (require.main === module) cli();

module.exports = { savevideoraw, download, getVideoUrl, detectPlatform };