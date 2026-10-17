/*
  Create: t.me/AwasPhpJir
  RestApis: api.ikyyxd.my.id
  Note: Lumayan Bagus Dari 150kb - 6,5mb
*/

const axios = require('axios');
const FormData = require('form-data');

class SwiftspeedUpscaler {
    constructor() {
        this.baseUrl = 'https://swiftspeed.app/api/v2/tools/upscale';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'Origin': 'https://swiftspeed.app',
            'Referer': 'https://swiftspeed.app/tools/image-upscaler'
        };
    }

    async fetchImageBuffer(imageUrl) {
        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            throw new Error(`Gagal mengunduh gambar dari URL: ${error.message}`);
        }
    }
    
    async createJob(imageBuffer, scale = 4) {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'upscale_target.jpg' });
        form.append('scale', scale.toString());

        try {
            const response = await axios.post(this.baseUrl, form, {
                headers: {
                    ...this.headers,
                    ...form.getHeaders()
                }
            });

            if (response.data && response.data.job_id) {
                return response.data.job_id;
            } else {
                throw new Error('Gagal mendapatkan job_id dari response.');
            }
        } catch (error) {
            throw new Error(`[CreateJob Failed]: ${error.response?.data?.message || error.message}`);
        }
    }

    async pollStatus(jobId) {
        const statusUrl = `${this.baseUrl}/status/${jobId}`;
        const maxRetries = 30;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await axios.get(statusUrl, { headers: this.headers });
                const data = response.data;

                if (data.status === 'done') {
                    const result = data.results?.[0];
                    if (result && result.download_url) {
                        const fullDownloadUrl = result.download_url.startsWith('http') 
                            ? result.download_url 
                            : `https://swiftspeed.app${result.download_url}`;

                        return {
                            status: true,
                            job_id: jobId,
                            original_size: result.original_size,
                            processed_size: result.processed_size,
                            download_url: fullDownloadUrl,
                            engine: result.engine || 'realesrgan'
                        };
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('Timeout: Proses upscale terlalu lama.');
    }

    async upscaleFromUrl(imageUrl, scale = 4) {
        try {
            const imageBuffer = await this.fetchImageBuffer(imageUrl);
            const jobId = await this.createJob(imageBuffer, scale);
            const resultData = await this.pollStatus(jobId);
            
            return resultData;
        } catch (error) {
            return {
                status: false,
                error: error.message
            };
        }
    }
}

(async () => {
    const upscaler = new SwiftspeedUpscaler();
    
    const targetUrl = 'https://raw.githubusercontent.com/IkyyEzzXD/IkyyGantengPoll/main/uploads/1786365676553_file_1057.jpg'; 
    const scaleFactor = 4;

    const jsonResult = await upscaler.upscaleFromUrl(targetUrl, scaleFactor);

    console.log(JSON.stringify(jsonResult, null, 2));
})();