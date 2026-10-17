const fetch = require('node-fetch');

// Generator User-Agent acak
function randomUserAgent() {
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Gecko/20100101 Firefox/122.0"
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// Helper untuk parse JSON aman
function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const BASE_URL = "https://terabox-worker.robinkumarshakya103.workers.dev";

async function safeFetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = tryParseJSON(text);
  if (!data) {
    throw new Error("Response bukan JSON: " + text.slice(0,100));
  }
  return data;
}

async function getDownloadLink(url, pwd = '') {
  const regex = /(?:surl=|\/)([a-zA-Z0-9-_]+)$/;
  const match = url.match(regex);
  if (!match) throw new Error('URL tidak valid / tidak didukung');
  const shortUrl = match[1];

  const ua = randomUserAgent();

  // Step 1: get-info-new
  const info = await safeFetchJSON(`${BASE_URL}/api/get-info-new?shorturl=${shortUrl}&pwd=${pwd}`, {
    headers: {
      'User-Agent': ua,
      'Accept': 'application/json',
      'Referer': BASE_URL
    }
  });
  if (!info.ok) throw new Error(info.message || 'Gagal ambil info');

  const file = info.list[0];
  if (!file) throw new Error('Tidak ada file ditemukan');

  // Step 2: get-download
  const dl = await safeFetchJSON(`${BASE_URL}/api/get-download`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'User-Agent': ua,
      'Accept': 'application/json',
      'Referer': BASE_URL
    },
    body: JSON.stringify({
      shareid: info.shareid,
      uk: info.uk,
      sign: info.sign,
      timestamp: info.timestamp,
      fs_id: file.fs_id
    })
  });
  if (!dl.ok) throw new Error(dl.message || 'Gagal ambil link download');

  return { link: dl.downloadLink, filename: file.filename || 'data.bin' };
}

module.exports = { getDownloadLink };