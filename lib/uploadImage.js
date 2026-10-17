const fetch = require('node-fetch');
const axios = require('axios');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

const tele = async (buffer) => {
  const { ext } = (await fromBuffer(buffer)) || { ext: 'jpg' };
  let form = new FormData();
  form.append('file', buffer, 'tmp.' + ext);
  let res = await fetch('https://telegra.ph/upload?source=bugtracker', {
    method: 'POST',
    body: form,
    headers: form.getHeaders() // <-- FIX: Wajib ada untuk mengirim boundary
  });
  let img = await res.json();
  if (img.error) throw new Error(img.error);
  return 'https://telegra.ph' + img[0].src;
};

const ugu = async (buffer) => {
  const { ext } = (await fromBuffer(buffer)) || { ext: 'jpg' };
  let form = new FormData();
  form.append("files[]", buffer, "tmp." + ext);
  let up = await fetch("https://uguu.se/upload", {
    method: "POST",
    body: form,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile)",
      ...form.getHeaders() // <-- FIX: Wajib ditambahkan
    }
  });
  let res = await up.json();
  return res.files?.[0]?.url || "";
};

const catbox = async (buffer) => {
  const { ext } = (await fromBuffer(buffer)) || { ext: 'bin' };
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, `file.${ext}`);
  const res = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity
  });
  return res.data;
};

module.exports = async (buffer) => {
  const { mime } = (await fromBuffer(buffer)) || {};

  if (mime?.startsWith('image/')) {
    try { 
      const link = await tele(buffer); 
      if (link) return link;
    } catch (e) {
      console.log('[Upload Error - Telegraph]:', e.message);
    }
    
    try { 
      const link = await ugu(buffer); 
      if (link) return link;
    } catch (e) {
      console.log('[Upload Error - Uguu]:', e.message);
    }
  }

  if (mime?.startsWith('video/')) {
    try { 
      const link = await ugu(buffer); 
      if (link) return link;
    } catch (e) {
      console.log('[Upload Error - Uguu Video]:', e.message);
    }
  }

  // Catbox sebagai andalan terakhir
  try { 
    const link = await catbox(buffer); 
    if (link) return link;
  } catch (e) {
    console.log('[Upload Error - Catbox]:', e.message);
  }

  return null;
};