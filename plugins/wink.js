const axios = require("axios");
const FormData = require("form-data");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const BASE_URL = "https://wink.ai";
const STRATEGY_URL = "https://strategy.app.meitudata.com";

const CLIENT_ID = "1189857605";
const VERSION = "5.1.2";
const COUNTRY_CODE = "ID";
const CLIENT_LANGUAGE = "en_US";
const CLIENT_TIMEZONE = "Asia/Jakarta";

const TASK_TYPE = "12";
const CONTENT_TYPE = "1";
const EXT_VALUE = "2";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extToMime(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function fileSuffix(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpeg") return ".jpg";
  if (ext) return ext;
  return ".jpg";
}

function makeTrace() {
  return `${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-1`;
}

function traceHeaders(transaction = "GET%20%2F%5Blocale%5D%2Fimage-enhancer%2Fupload") {
  const trace = makeTrace();
  return {
    "sentry-trace": trace,
    baggage: [
      "sentry-environment=release",
      "sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)",
      "sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54",
      `sentry-trace_id=${trace.split("-")[0]}`,
      `sentry-transaction=${transaction}`,
      "sentry-sampled=true",
      "sentry-sample_rate=0.75"
    ].join(",")
  };
}

// FUNGSI UTAMA YANG DI-EKSPORT
async function upscale(IMAGE_PATH) {
  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error(`File tidak ditemukan: ${IMAGE_PATH}`);
  }
  await fsp.stat(IMAGE_PATH);

  const TASK_NAME = `Enhancer-Ultra HD-${path.parse(IMAGE_PATH).name}`;
  const GNUM = crypto.randomUUID();
  const jar = new CookieJar();
  await jar.setCookie(`_sm=${GNUM}; Path=/; Domain=wink.ai`, BASE_URL);
  await jar.setCookie(
    `meitustat=${encodeURIComponent(JSON.stringify({ wgid: GNUM }))}; Path=/; Domain=wink.ai`,
    BASE_URL
  );

  const api = wrapper(axios.create({
    baseURL: BASE_URL,
    jar,
    withCredentials: true,
    validateStatus: () => true,
    headers: {
      accept: "*/*",
      origin: BASE_URL,
      referer: `${BASE_URL}/image-enhancer/upload`,
      "user-agent": UA,
      "sec-ch-ua": "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"",
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": "\"Android\"",
      ab_info: JSON.stringify({ ab_codes: [], version: "1.4.4" })
    }
  }));

  function baseParams(extra = {}) {
    return new URLSearchParams({
      client_id: CLIENT_ID,
      version: VERSION,
      country_code: COUNTRY_CODE,
      gnum: GNUM,
      client_language: CLIENT_LANGUAGE,
      client_channel_id: "",
      client_timezone: CLIENT_TIMEZONE,
      ...extra
    });
  }

  const signParams = baseParams({ suffix: fileSuffix(IMAGE_PATH), type: "temp", count: "1" });
  const signRes = await api.get(`/api/file/get_maat_sign.json?${signParams.toString()}`, { headers: traceHeaders() });
  if (signRes.status >= 400 || signRes.data?.code !== 0) throw new Error(`get_maat_sign gagal: ${JSON.stringify(signRes.data)}`);
  const sign = signRes.data.data;

  const policyParams = new URLSearchParams({
    app: sign.app, count: String(sign.count), sig: sign.sig,
    sigTime: sign.sig_time, sigVersion: sign.sig_version, suffix: sign.suffix, type: sign.type
  });
  const policyRes = await axios.get(`${STRATEGY_URL}/upload/policy?${policyParams.toString()}`, {
    headers: { origin: BASE_URL, referer: `${BASE_URL}/`, "user-agent": UA }, validateStatus: () => true
  });
  if (policyRes.status >= 400 || !Array.isArray(policyRes.data) || !policyRes.data[0]?.qiniu) throw new Error(`upload policy gagal`);
  const policy = policyRes.data[0].qiniu;

  const form = new FormData();
  form.append("file", fs.createReadStream(IMAGE_PATH), { filename: path.basename(IMAGE_PATH), contentType: extToMime(IMAGE_PATH) });
  form.append("token", policy.token);
  form.append("key", policy.key);
  form.append("fname", path.basename(IMAGE_PATH));

  const uploadRes = await axios.post(policy.url, form, {
    headers: form.getHeaders({ origin: BASE_URL, referer: `${BASE_URL}/`, "user-agent": UA, accept: "*/*" }),
    maxBodyLength: Infinity, maxContentLength: Infinity, validateStatus: () => true
  });
  if (!uploadRes.data?.url && !uploadRes.data?.data) throw new Error(`upload qiniu gagal`);
  const uploaded = { file_key: policy.key, source_url: uploadRes.data.url || uploadRes.data.data || policy.data };

  await api.post("/api/file/meta_info.json", baseParams({ file_key: uploaded.file_key }).toString(), { headers: { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
  
  const itemList = JSON.stringify([{
    type: Number(TASK_TYPE), ext_value: EXT_VALUE, content_type: Number(CONTENT_TYPE), duration: 0,
    type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }),
    right_detail: JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: "https://wink.ai/image-enhancer/upload" })
  }]);
  await api.post("/api/subscribe/batch_calc_need_beans.json", baseParams({ item_list: itemList }).toString(), { headers: { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });

  const deliveryBody = baseParams({
    type: TASK_TYPE, content_type: CONTENT_TYPE, source_url: uploaded.source_url,
    type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }),
    right_detail: JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: "https://wink.ai/image-enhancer/upload" }),
    ext_params: JSON.stringify({ task_name: TASK_NAME, records: TASK_TYPE }), with_prepare: "1"
  });
  const deliveryRes = await api.post("/api/meitu_ai/delivery.json", deliveryBody.toString(), { headers: { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" } });
  if (deliveryRes.status >= 400 || deliveryRes.data?.code !== 0) throw new Error(`delivery gagal`);
  const task = deliveryRes.data.data || {};
  const firstMsgId = task.msg_id || task.prepare_msg_id;
  if (!firstMsgId) throw new Error(`Tidak mendapat msg_id`);

  let msgId = firstMsgId;
  for (let i = 1; i <= 80; i++) {
    const queryParams = baseParams({ msg_ids: msgId });
    const queryRes = await api.get(`/api/meitu_ai/query_batch.json?${queryParams.toString()}`, { headers: { ...traceHeaders("%2F%3Alocale%2Feditor%2Frecent-task"), referer: `${BASE_URL}/image-enhancer/upload` } });
    const data = queryRes.data.data;
    
    const item = data?.item_list?.[0];
    const resultValue = item?.result?.result || "";
    const realMsgId = item?.result?.msg_id || item?.msg_id || "";
    const nextMsgId = (resultValue && resultValue !== msgId && !resultValue.startsWith("http")) ? resultValue : (realMsgId && realMsgId !== msgId && !realMsgId.startsWith("wpr_")) ? realMsgId : "";

    if (nextMsgId) {
      msgId = nextMsgId;
      await sleep(1000);
      continue;
    }

    const url = item?.result?.media_info_list?.[0]?.media_data || "";
    const errorCode = item?.result?.error_code;
    if (url && url.startsWith("http") && errorCode === 0) return url;
    if (errorCode && errorCode !== 29901 && errorCode !== 0) throw new Error(`task gagal: ${errorCode}`);
    await sleep(3000);
  }
  throw new Error(`Timeout saat memproses gambar.`);
}

module.exports = { upscale };