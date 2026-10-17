const fetch = require('node-fetch');

async function scrapePixeldrain(url) {
  const res = await fetch(url);
  const html = await res.text();

  let fileId = null;
  let fileName = null;
  let mimeType = null;

  // Ambil dari api_response (file tunggal)
  const idMatch = html.match(/"api_response":\{[^}]*"id":"([A-Za-z0-9]+)"/);
  if (idMatch) fileId = idMatch[1];

  const nameMatch = html.match(/"name":"([^"]+)"/);
  if (nameMatch) fileName = nameMatch[1];

  const mimeMatch = html.match(/"mime_type":"([^"]+)"/);
  if (mimeMatch) mimeType = mimeMatch[1];

  // Kalau tidak ketemu, coba ambil dari files (list)
  if (!fileId) {
    const listIdMatch = html.match(/"files":\[\{"id":"([A-Za-z0-9]+)"/);
    if (listIdMatch) fileId = listIdMatch[1];

    const listNameMatch = html.match(/"files":\[\{"id":"[A-Za-z0-9]+","name":"([^"]+)"/);
    if (listNameMatch) fileName = listNameMatch[1];

    const listMimeMatch = html.match(/"mime_type":"([^"]+)"/);
    if (listMimeMatch) mimeType = listMimeMatch[1];
  }

  if (!fileId) throw new Error("File ID tidak ditemukan");

  const directLink = `https://pixeldrain.com/api/file/${fileId}`;

  return { fileId, fileName, mimeType, directLink };
}

module.exports = { scrapePixeldrain };