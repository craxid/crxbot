/**
 * Visual Paradigm AI Image Upscaler
 * ──────────────────────────────────
 * Scraper: https://ai-services.visual-paradigm.com/api/super-resolution/file
 * Result auto-uploaded to uguu.se
 *
 * Credit: febry.is-a.dev | github.com/vandebry10-star
 * DO NOT REMOVE THIS CREDIT
 */

const axios = require("axios");
const FormData = require("form-data");

const CREDIT = "febry.is-a.dev | github.com/vandebry10-star | DO NOT REMOVE THIS CREDIT";

class VisualParadigmUpscaler {
  constructor() {
    this.url = "https://ai-services.visual-paradigm.com/api/super-resolution/file";
    this.uguuUrl = "https://uguu.se/upload";
    this.timeout = 30000;
  }

  async upscale(imageUrl) {
    let buffer, contentType;

    if (imageUrl instanceof Buffer) {
      buffer = imageUrl;
      contentType = "image/png";
    } else if (typeof imageUrl === 'string' && imageUrl.startsWith("http")) {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: this.timeout,
      });
      buffer = Buffer.from(res.data);
      contentType = res.headers["content-type"] || "image/jpeg";
    } else if (typeof imageUrl === 'string') {
      const match = imageUrl.match(/^data:(image\/.+?);base64,/);
      const b64 = match ? imageUrl.substring(match[0].length) : imageUrl;
      contentType = match ? match[1] : "image/png";
      buffer = Buffer.from(b64, "base64");
    } else {
      throw new Error("Input gambar tidak valid. Harus berupa URL, Base64, atau Buffer.");
    }

    const form = new FormData();
    form.append("file", buffer, {
      filename: "image." + (contentType.split("/")[1] || "png"),
      contentType,
    });

    const res = await axios.post(this.url, form, {
      headers: { ...form.getHeaders(), accept: "*/*" },
      responseType: "arraybuffer",
      timeout: this.timeout,
    });

    return Buffer.from(res.data);
  }

  async uploadToUguu(buffer) {
    const ext = this.detectExt(buffer);
    const form = new FormData();
    form.append("files[]", buffer, { filename: `upscaled_${Date.now()}.${ext}` });

    const res = await axios.post(this.uguuUrl, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    if (!res.data.success) throw new Error("Upload to uguu failed");
    return res.data.files[0];
  }

  detectExt(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
    if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
    if (buf[0] === 0x52 && buf[1] === 0x49) return "webp";
    return "jpg";
  }
}

module.exports = { VisualParadigmUpscaler };