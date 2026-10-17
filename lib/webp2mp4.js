const fetch = require('node-fetch')
const FormData = require('form-data')
const { JSDOM } = require('jsdom')

async function webp2mp4(source) {
    let form = new FormData()
    let isUrl = typeof source === 'string' && /https?:\/\//.test(source)
    
    // Step 1: Upload
    form.append('new-image-url', isUrl ? source : '')
    form.append('new-image', isUrl ? '' : source, { filename: 'image.webp' })
    
    let res = await fetch('https://ezgif.com/webp-to-mp4', {
        method: 'POST',
        body: form
    })
    
    let html = await res.text()
    let { document } = new JSDOM(html).window
    
    // Mengambil semua input dari form konversi agar tidak dicurigai bot
    let formAction = document.querySelector('.form.ajax-form')
    if (!formAction) throw 'Gagal mengupload. Pastikan media adalah stiker animasi valid.'
    
    let postUrl = formAction.getAttribute('action')
    let form2 = new FormData()
    
    // Ambil SEMUA input (file, background, repeat, dll) secara dinamis
    document.querySelectorAll('.form.ajax-form input').forEach(input => {
        if (input.name) form2.append(input.name, input.value)
    })

    // Step 2: Konversi
    let res2 = await fetch(postUrl.startsWith('http') ? postUrl : 'https:' + postUrl, {
        method: 'POST',
        body: form2
    })
    
    let html2 = await res2.text()
    let document2 = new JSDOM(html2).window.document
    
    // Mencari output video dengan selector yang lebih kuat
    let video = document2.querySelector('div#output video source') || document2.querySelector('video source')
    
    if (!video) {
        // Cek jika ada pesan error dari EZGIF di HTML-nya
        let errorMsg = document2.querySelector('.error')?.textContent
        throw errorMsg || 'Gagal menemukan hasil konversi. Coba lagi beberapa saat.'
    }
    
    let result = video.getAttribute('src')
    return result.startsWith('http') ? result : 'https:' + result
}

module.exports = { webp2mp4 }
