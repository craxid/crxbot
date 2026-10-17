// Client untuk CraXID Scraper API
// Ganti pemanggilan scraper lokal (lib/douyin, lib/spotify, dll)
// jadi request HTTP ke API. Interface dibuat sama biar plugin
// tidak perlu diubah logikanya, cukup ganti require-nya.

const fetch = require('node-fetch')

// ganti dengan URL API kamu kalau pindah host
const BASE = process.env.RESAPI_URL || 'https://api.hxa.my.id'

async function call(endpoint, url) {
  const res = await fetch(`${BASE}/api/${endpoint}?url=${encodeURIComponent(url)}`)
  const json = await res.json()
  if (!json.status) throw new Error(json.message || 'API error')
  return json.data
}

// pengganti lib/douyin.js -> douyin(url)
async function douyin(url) {
  return call('douyin', url)
}

// pengganti lib/scraper-tiktok.js -> scrapeTikTok(url)
async function scrapeTikTok(url) {
  return call('tiktok', url)
}

// pengganti lib/igdl.js -> handler({ url })
async function igdlHandler({ url }) {
  return call('igdl', url)
}

// pengganti lib/spotify.js -> new Spotify().download(url)
class Spotify {
  async download(url) {
    return call('spotify', url)
  }
}

// pengganti lib/ytdl.js -> getDownloadInfo(url)
async function getDownloadInfo(url) {
  return call('ytdl', url)
}

// pengganti lib/gdrive.js -> link_gdrive(url)
async function gdrive(url) {
  return call('gdrive', url)
}

// pengganti lib/tera.js -> new Terabox().extract(url)
class Terabox {
  async extract(url) {
    return call('terabox', url)
  }
}

module.exports = {
  douyin,
  scrapeTikTok,
  handler: igdlHandler,
  Spotify,
  getDownloadInfo,
  gdrive,
  Terabox
}
