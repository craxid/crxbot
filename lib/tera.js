const axios = require('axios');

class Terabox {
    constructor(cookie = '') {
        this.cookie = cookie;
        this.client = axios.create({
            baseURL: 'https://www.terabox.com',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Cookie': this.cookie,
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
            },
            timeout: 15000
        });
        
        this.yunData = {};
        this.jsToken = null;
    }

    parseUrl(rawUrl) {
        const urlObj = new URL(rawUrl);
        let surl = urlObj.searchParams.get('surl') || urlObj.searchParams.get('shorturl');
        
        if (!surl) {
            const match = urlObj.pathname.match(/\/(?:s|sharing\/link|share\/link)\/([A-Za-z0-9_\-]{6,})/);
            if (match) surl = match[1];
        } else {
            surl = surl.startsWith('1') ? surl.substring(1) : surl;
        }

        const pwd = urlObj.searchParams.get('pwd') || '';
        return { surl, pwd };
    }

    async getPageData(surl) {
        try {
            const res = await this.client.get(`/sharing/link?surl=${surl}`);
            const html = res.data;

            const jsTokenMatch = html.match(/fn\("([0-9a-fA-F]{24,})"\)/) || html.match(/"jsToken"\s*:\s*"([0-9a-fA-F]{24,})"/);
            if (jsTokenMatch) this.jsToken = jsTokenMatch[1];

            const yunMatch = html.match(/window\.yunData\s*=\s*(\{.*?\});/s);
            if (yunMatch) this.yunData = JSON.parse(yunMatch[1]);

            return { jsToken: this.jsToken, yunData: this.yunData };
        } catch (error) {
            throw new Error(`Gagal memuat halaman: ${error.message}`);
        }
    }

    async verifyCode(surl, pwd) {
        try {
            const res = await this.client.post('/share/verify', 
                `pwd=${pwd}&vcode=&vcode_str=`, 
                {
                    params: {
                        surl: surl,
                        t: Date.now(),
                        jsToken: this.jsToken,
                        app_id: '250528'
                    },
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );
            return res.data;
        } catch (error) {
            throw new Error(`Gagal verifikasi kode: ${error.message}`);
        }
    }

    async getFileList(surl, dir = '') {
        try {
            const params = {
                app_id: '250528',
                shorturl: surl,
                root: dir ? '0' : '1',
                dir: dir,
                jsToken: this.jsToken
            };

            const res = await this.client.get('/share/list', { params });
            if (res.data.errno !== 0) throw new Error(`API Error: ${res.data.errno}`);
            
            return res.data.list;
        } catch (error) {
            throw new Error(`Gagal mengambil daftar file: ${error.message}`);
        }
    }

    async getDownloadLink(fs_id) {
        try {
            const params = {
                app_id: '250528',
                jsToken: this.jsToken,
                sign: this.yunData.sign,
                timestamp: this.yunData.timestamp,
                shareid: this.yunData.shareid,
                uk: this.yunData.uk,
                primaryid: this.yunData.shareid
            };

            const payload = `fid_list=[${fs_id}]&type=nolimit`;

            const res = await this.client.post('/api/sharedownload', payload, {
                params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (res.data.errno !== 0) throw new Error(`Dlink Error: ${res.data.errno}`);
            return res.data.list[0].dlink;
        } catch (error) {
            throw new Error(`Gagal mengambil dlink: ${error.message}`);
        }
    }

    async extract(url) {
        const { surl, pwd } = this.parseUrl(url);
        if (!surl) throw new Error("Link tidak valid (surl tidak ditemukan)");

        await this.getPageData(surl);

        if (pwd) {
            const verify = await this.verifyCode(surl, pwd);
            if (verify.errno !== 0) console.warn("Peringatan verifikasi:", verify.errno);
        }

        const files = await this.getFileList(surl);
        if (!files || files.length === 0) throw new Error("Tidak ada file ditemukan");

        const results = [];
        for (let fileData of files) {
            if (fileData.isdir === 1) continue; // Lewati folder
            try {
                const dlink = await this.getDownloadLink(fileData.fs_id);
                results.push({
                    filename: fileData.server_filename,
                    size: fileData.size,
                    md5: fileData.md5,
                    dlink: dlink
                });
            } catch (err) {
                console.error(`Gagal mendapat link untuk ${fileData.server_filename}:`, err.message);
            }
        }

        return results;
    }
}

module.exports = Terabox;