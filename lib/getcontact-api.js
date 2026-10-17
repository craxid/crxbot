const axios = require('axios');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// Masukkan Token dan Key di sini atau ambil dari config.js
const TOKEN_SAYA = '121703685';
const KUNCI_AKHIR = 'ISI_API_KEY_DISINI';

const _x = 'a72c9287558ee38d8dbeef1d247501e5:2b8b832995bd50686257c29f869571e4d81901751823fd7159cc535c4cc76f826ea56b0cf162d1a98fc2670c9657c41efce3faf20ebc9ccf74e0ea027d14a6da99d06fe106bb0358be0ca6001f60cf17cc1a108ee6aa02379cf8c01b3481704062c373f8ed9542ced8e1afdd73eadd5d4e4945ab7cf55668a8fb2cd5788ba2873c4aa651e08bc2528870816ab0cb0f3ede497e645650f49d0bb1c7f88417cc1338ad879ac5b3bbbc745d7c6c86c8ad7ce75c3be615599351e45f1a51f1a8f335dc4e8fc96067f815b3f2559021c475a66cebf650befe31ba709ef7a66b001667';
const _k = 'autoftbot69';

function _buka() {
    const b = _x.split(':');
    const iv = Buffer.from(b[0], 'hex');
    const kunci = crypto.createHash('sha256').update(_k).digest();
    const d = crypto.createDecipheriv('aes-256-cbc', kunci, iv);
    let r = d.update(b[1], 'hex', 'utf8');
    r += d.final('utf8');
    return JSON.parse(r);
}
const _cfg = _buka();

function enkripsiData(teks, kunci) {
    return CryptoJS.AES.encrypt(teks, CryptoJS.enc.Hex.parse(kunci), { mode: CryptoJS.mode.ECB }).toString();
}

function dekripsiData(teksEnkripsi, kunci) {
    return CryptoJS.AES.decrypt(teksEnkripsi, CryptoJS.enc.Hex.parse(kunci), { mode: CryptoJS.mode.ECB }).toString(CryptoJS.enc.Utf8);
}

function buatTandaTangan(waktu, isiBody) {
    return CryptoJS.HmacSHA256(`${waktu}-${isiBody}`, CryptoJS.enc.Hex.parse(_cfg.h)).toString(CryptoJS.enc.Base64);
}

function formatNomorHP(nomor) {
    nomor = nomor.replace(/[\s\-()]/g, '');
    if (nomor.startsWith('0')) return '+62' + nomor.slice(1);
    if (nomor.startsWith('62')) return '+' + nomor;
    if (!nomor.startsWith('+')) return '+62' + nomor;
    return nomor;
}

async function cariNomor(nomorHP) {
    const nomor = formatNomorHP(nomorHP);
    const isiRequest = { countryCode: 'id', phoneNumber: nomor, source: 'search', token: TOKEN_SAYA };
    const waktu = Date.now().toString();
    const body = JSON.stringify(isiRequest);
    const tanda = buatTandaTangan(waktu, body);
    const terenkripsi = enkripsiData(body, KUNCI_AKHIR);

    const res = await axios.post(_cfg.u, { data: terenkripsi }, {
        headers: {
            'Content-Type': 'application/json',
            'X-Os': 'android 9',
            'X-Mobile-Service': 'GMS',
            'X-App-Version': '5.6.2',
            'X-Client-Device-Id': _cfg.d,
            'X-Lang': 'in_ID',
            'X-Token': TOKEN_SAYA,
            'X-Req-Timestamp': waktu,
            'X-Encrypted': '1',
            'X-Network-Country': 'id',
            'X-Country-Code': 'id',
            'X-Req-Signature': tanda,
        },
    });

    const hasil = JSON.parse(dekripsiData(res.data.data, KUNCI_AKHIR));
    const profil = hasil.result?.profile || {};
    const kuota = hasil.result?.subscriptionInfo?.usage?.search || {};

    return {
        nomor: profil.phoneNumber || nomor,
        nama: profil.displayName || 'Tidak ditemukan',
        jumlahTag: profil.tagCount || 0,
        badge: hasil.result?.badge || '-',
        spam: hasil.result?.spamInfo?.degree || 'aman',
        sisaKuota: kuota.remainingCount,
        batasKuota: kuota.limit
    };
}

module.exports = { cariNomor };