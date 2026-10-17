const { URL_REGEX } = require('@adiwajshing/baileys');
const FileType = require('file-type');
const axios = require('axios');

let handler = async (m, { conn, text }) => {
	if (!text) return m.reply('Input Query / Pixiv Url');

	try {
		await m.reply(typeof wait !== 'undefined' ? wait : '⏳ Sedang mencari...');

		let res = await pixivDl(text);
		
		for (let i = 0; i < res.media.length; i++) {
			let tagsJoined = Array.isArray(res.tags) ? res.tags.join(', ') : 'Tidak ada tag';
			let caption = i === 0 ? `${res.caption}\n\n*By:* ${res.artist}\n*Tags:* ${tagsJoined}` : '';
			let mime = (await FileType.fromBuffer(res.media[i])).mime;
			
			setTimeout(() => {
				conn.sendPresenceUpdate('composing', m.chat);
				conn.sendMessage(m.chat, { 
                    [mime.split('/')[0]]: res.media[i], 
                    caption: caption, 
                    mimetype: mime 
                }, { quoted: m });
			}, 2000);
		}
	} catch (e) {
		console.error('Pixiv Handler Error:', e);
		let errorMsg = e.message ? e.message : e;
		m.reply(`❌ Terjadi kesalahan:\n${errorMsg}`);
	}
}

handler.help = ['pixiv'];
handler.tags = ['downloader'];
handler.limit = 3;
handler.command = /^(pixiv)$/i;

module.exports = handler;

async function pixivDl(query) {
	try {
		let searchQuery = query;
		
		if (query.match(URL_REGEX) && /https:\/\/www.pixiv.net\/en\/artworks\/[0-9]+/i.test(query)) {
			searchQuery = query.replace(/\D/g, '');
		}

		const apiUrl = `https://api.andaraz.com/api/pixiv/search?q=${encodeURIComponent(searchQuery)}&page=1&order=1&mode=&s_mode=&type=&phpsessid=&apikey=${global.andaraz || "3ea693ca"}`;
		const { data } = await axios.get(apiUrl);

		// 1. Cek jika API merespons status false dari awal
		if (data.status === false) {
			throw new Error(data.message || `Pencarian "${query}" tidak ditemukan.`);
		}

		// 2. Cek apakah data.data dan data.data.results valid berupa array yang ada isinya
		if (!data.data || !data.data.results || !Array.isArray(data.data.results) || data.data.results.length === 0) {
			throw new Error(`Pencarian "${query}" tidak memberikan hasil.`);
		}

		// Ambil hasil acak dari array results
		const result = data.data.results[Math.floor(Math.random() * data.data.results.length)];
		
		// 3. Ambil URL gambar (prioritas menggunakan properti 'image' dari struktur JSON baru)
		const imgUrl = result.image;
		
		if (!imgUrl) {
			throw new Error('URL gambar tidak tersedia dari API untuk hasil ini.');
		}

		const imgResponse = await axios.get(imgUrl, { responseType: 'arraybuffer' });
		const mediaBuffer = Buffer.from(imgResponse.data);

		return {
			artist: result.author?.name || 'Tidak diketahui', 
			caption: result.title || 'Tanpa Judul', 
			tags: result.tags || [], 
			media: [mediaBuffer] 
		};
	} catch (err) {
		if (err.response && err.response.data) {
			const apiErr = err.response.data;
			if (apiErr.status === false && apiErr.message) {
				throw new Error(apiErr.message);
			}
			throw new Error(`API Error: ${err.response.status} - ${err.response.statusText}`);
		}
		throw err;
	}
}