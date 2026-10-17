/**
 * nhentai API v2 Wrapper
 * Dokumentasi referensi: OAS 3.1.0 nhentai API v2
 * Maintainer: CraXID
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

class NhentaiAPI {
  /**
   * @param {string} apiKey - API Key dari pengaturan akun nhentai.
   * @param {string} userAgent - User-Agent deskriptif.
   */
  constructor(apiKey = process.env.NHENTAI_API_KEY || 'ISI_API_KEY_DISINI', userAgent = 'CraXID-Bot/1.0') {
    this.baseUrl = 'https://nhentai.net/api/v2';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': userAgent 
    };

    if (apiKey) {
      this.headers['Authorization'] = `Key ${apiKey}`;
    }
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  // --- Core Methods ---

  async search(query, page = 1, sort = 'date') {
    const params = new URLSearchParams({ query, page, sort });
    return this._request(`/search?${params.toString()}`);
  }

  async getGallery(galleryId) {
    return this._request(`/galleries/${galleryId}`);
  }

  async getPopular() {
    return this._request('/galleries/popular');
  }

  async getRandom() {
    return this._request('/galleries/random');
  }

  async getDownloadUrl(galleryId, format = 'zip') {
    // API menggunakan POST untuk mendapatkan link download/token
    return this._request(`/galleries/${galleryId}/download`, {
      method: 'POST',
      body: JSON.stringify({ format })
    });
  }

  /**
   * Mengunduh file gallery dan menyimpannya ke disk.
   * @param {string} galleryId - ID gallery.
   * @param {string} outputDir - Folder tujuan penyimpanan.
   * @param {string} format - 'zip', 'cbz', atau 'torrent'.
   */
  async downloadGallery(galleryId, outputDir = './downloads', format = 'zip') {
    // 1. Dapatkan metadata download
    const data = await this.getDownloadUrl(galleryId, format);
    
    // Pastikan URL tersedia (sesuaikan dengan respon API)
    const downloadUrl = data.url || data.download_url; 
    if (!downloadUrl) {
      throw new Error("Gagal mendapatkan URL download dari API.");
    }

    // 2. Persiapkan direktori
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 3. Fetch file dari URL
    const response = await fetch(downloadUrl, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Gagal mendownload file: ${response.statusText}`);
    }

    // 4. Stream ke file
    const filePath = path.join(outputDir, `${galleryId}.${format}`);
    await pipeline(response.body, fs.createWriteStream(filePath));
    
    return filePath;
  }
}

module.exports = NhentaiAPI;