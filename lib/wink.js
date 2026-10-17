const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const BASE_URL = "https://wink.ai";
const STRATEGY_URL = "https://strategy.app.meitudata.com";
const CLIENT_ID = "1189857605";
const VERSION = "5.1.2";
const COUNTRY_CODE = "ID";
const CLIENT_LANGUAGE = "en_US";
const CLIENT_TIMEZONE = "Asia/Jakarta";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extToMime(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".mov") return "video/quicktime";
    if (ext === ".webm") return "video/webm";
    if (ext === ".mkv") return "video/x-matroska";
    return "application/octet-stream";
}

function fileSuffix(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".jpeg") return ".jpg";
    if (ext) return ext;
    return ".jpg";
}

class WinkProcess {
    constructor(filePath) {
        this.filePath = filePath;
        this.ext = path.extname(filePath).toLowerCase();
        this.isVideo = ['.mp4', '.mov', '.webm', '.mkv'].includes(this.ext);
        
        // Atur parameter dinamis (Video = 11, Image = 12)
        this.TASK_TYPE = this.isVideo ? "11" : "12";
        this.CONTENT_TYPE = this.isVideo ? "2" : "1";
        this.TASK_NAME = `Enhancer-Ultra HD-${path.parse(filePath).name}`;
        this.GNUM = crypto.randomUUID();
        this.jar = new CookieJar();
        
        const refererPath = this.isVideo ? 'video-enhancer' : 'image-enhancer';
        this.api = wrapper(axios.create({
            baseURL: BASE_URL,
            jar: this.jar,
            withCredentials: true,
            validateStatus: () => true,
            headers: {
                accept: "*/*",
                origin: BASE_URL,
                referer: `${BASE_URL}/${refererPath}/upload`,
                "user-agent": UA,
                "sec-ch-ua": "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"",
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": "\"Android\"",
                ab_info: JSON.stringify({ ab_codes: [], version: "1.4.4" })
            }
        }));
    }

    async init() {
        await this.jar.setCookie(`_sm=${this.GNUM}; Path=/; Domain=wink.ai`, BASE_URL);
        await this.jar.setCookie(`meitustat=${encodeURIComponent(JSON.stringify({ wgid: this.GNUM }))}; Path=/; Domain=wink.ai`, BASE_URL);
    }

    baseParams(extra = {}) {
        return new URLSearchParams({
            client_id: CLIENT_ID, version: VERSION, country_code: COUNTRY_CODE,
            gnum: this.GNUM, client_language: CLIENT_LANGUAGE, client_channel_id: "",
            client_timezone: CLIENT_TIMEZONE, ...extra
        });
    }

    traceHeaders(transaction) {
        const trace = `${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-1`;
        let baggage = [
            "sentry-environment=release",
            "sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)",
            "sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54",
            `sentry-trace_id=${trace.split("-")[0]}`,
            "sentry-sampled=true", "sentry-sample_rate=0.75"
        ];
        if (transaction) baggage.splice(4, 0, `sentry-transaction=${transaction}`);
        return { "sentry-trace": trace, baggage: baggage.join(",") };
    }

    // --- PROSES BERSAMA ---
    async uploadMedia() {
        const signParams = this.baseParams({ suffix: fileSuffix(this.filePath), type: "temp", count: "1" });
        const signRes = await this.api.get(`/api/file/get_maat_sign.json?${signParams.toString()}`, { headers: this.traceHeaders() });
        if (signRes.data?.code !== 0) throw new Error(`Gagal get_maat_sign`);
        const sign = signRes.data.data;

        const policyRes = await axios.get(`${STRATEGY_URL}/upload/policy?` + new URLSearchParams({
            app: sign.app, count: String(sign.count), sig: sign.sig, sigTime: sign.sig_time, sigVersion: sign.sig_version, suffix: sign.suffix, type: sign.type
        }).toString(), { headers: { origin: BASE_URL, referer: `${BASE_URL}/`, "user-agent": UA }, validateStatus: () => true });
        if (!policyRes.data[0]?.qiniu) throw new Error(`Gagal ambil upload policy`);
        const policy = policyRes.data[0].qiniu;

        const form = new FormData();
        form.append("file", fs.createReadStream(this.filePath), { filename: path.basename(this.filePath), contentType: extToMime(this.filePath) });
        form.append("token", policy.token);
        form.append("key", policy.key);
        form.append("fname", path.basename(this.filePath));

        const uploadRes = await axios.post(policy.url, form, { headers: form.getHeaders({ origin: BASE_URL, referer: `${BASE_URL}/`, "user-agent": UA }), validateStatus: () => true, maxBodyLength: Infinity });
        if (!uploadRes.data?.url && !uploadRes.data?.data) throw new Error(`Gagal upload Qiniu`);
        
        return { file_key: policy.key, source_url: uploadRes.data.url || uploadRes.data.data || policy.data };
    }

    // --- EXECUTION PIPELINE ---
    async start() {
        if (!fs.existsSync(this.filePath)) throw new Error(`File tidak ditemukan`);
        await fsp.stat(this.filePath);
        await this.init();

        const uploaded = await this.uploadMedia();
        let deliveryUrl = uploaded.source_url;
        let videoTranscoded = undefined;

        if (this.isVideo) {
            // Pipeline Video
            await this.api.post("/api/file/video_cover_and_display_info_ext.json", this.baseParams({ file_key: uploaded.file_key }).toString(), { headers: { ...this.traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
            const transStart = await this.api.post("/api/file/video_trans_start.json", this.baseParams({ file_key: uploaded.file_key }).toString(), { headers: { ...this.traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
            const transId = transStart.data?.data?.id;
            
            for (let i = 1; i <= 80; i++) {
                const transQuery = await this.api.get(`/api/file/video_trans_query.json?${this.baseParams({ id: transId }).toString()}`, { headers: this.traceHeaders() });
                const d = transQuery.data?.data || {};
                const vt = d.video_transcoded || d.transcoded_video || d.transcoded_url || d.video_url;
                if (vt) {
                    deliveryUrl = d.video || d.url || d.source_url || uploaded.source_url;
                    videoTranscoded = vt;
                    break;
                }
                await sleep(3000);
            }
        } else {
            // Pipeline Image
            await this.api.post("/api/file/meta_info.json", this.baseParams({ file_key: uploaded.file_key }).toString(), { headers: { ...this.traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
            await this.api.post("/api/subscribe/batch_calc_need_beans.json", this.baseParams({ item_list: JSON.stringify([{ type: Number(this.TASK_TYPE), ext_value: "2", content_type: Number(this.CONTENT_TYPE), duration: 0, type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }), right_detail: JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: "https://wink.ai/image-enhancer/upload" }) }]) }).toString(), { headers: { ...this.traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
        }

        // Delivery
        const extParams = { task_name: this.TASK_NAME, records: this.TASK_TYPE };
        if (this.isVideo && videoTranscoded) extParams.video_transcoded = videoTranscoded;
        
        const deliveryRes = await this.api.post("/api/meitu_ai/delivery.json", this.baseParams({
            type: this.TASK_TYPE, content_type: this.CONTENT_TYPE, source_url: deliveryUrl,
            type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }),
            right_detail: JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: `https://wink.ai/${this.isVideo ? 'video' : 'image'}-enhancer/upload` }),
            ext_params: JSON.stringify(extParams), with_prepare: "1"
        }).toString(), { headers: { ...this.traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
        
        const firstMsgId = deliveryRes.data?.data?.msg_id || deliveryRes.data?.data?.prepare_msg_id;
        if (!firstMsgId) throw new Error("Gagal mendapatkan msg_id task");

        // Polling Wait Result
        let msgId = firstMsgId;
        const maxTry = this.isVideo ? 120 : 80;
        const delayMs = this.isVideo ? 5000 : 3000;

        for (let i = 1; i <= maxTry; i++) {
            const queryRes = await this.api.get(`/api/meitu_ai/query_batch.json?${this.baseParams({ msg_ids: msgId }).toString()}`, { headers: { ...this.traceHeaders("%2F%3Alocale%2Feditor%2Frecent-task"), referer: `${BASE_URL}/${this.isVideo ? 'video' : 'image'}-enhancer/upload` } });
            const item = queryRes.data?.data?.item_list?.[0];
            
            const rValue = item?.result?.result || "";
            const rMsgId = item?.result?.msg_id || item?.msg_id || "";
            const nextMsgId = (rValue && rValue !== msgId && !rValue.startsWith("http")) ? rValue : (rMsgId && rMsgId !== msgId && !rMsgId.startsWith("wpr_")) ? rMsgId : "";

            if (nextMsgId) { msgId = nextMsgId; await sleep(1000); continue; }

            const finalUrl = item?.result?.media_info_list?.[0]?.media_data || item?.result?.result_url || item?.result?.url || item?.client_ext_params?.video_transcoded || "";
            const errorCode = item?.result?.error_code;

            if (finalUrl && finalUrl.startsWith("http") && errorCode === 0) return finalUrl;
            if (errorCode && errorCode !== 29901 && errorCode !== 0) throw new Error(`Task Error: ${errorCode}`);

            await sleep(delayMs);
        }
        throw new Error(`Timeout memproses media.`);
    }
}

async function upscale(filePath) {
    const process = new WinkProcess(filePath);
    return await process.start();
}

module.exports = { upscale };