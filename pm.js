module.exports = {
  apps: [{
    name: "app-saya",
    script: "./index.js",
    args: "--gconly", // Hapus baris ini jika --gconly adalah argumen Node
    node_args: "", // Isi dengan "--gconly" jika itu argumen Node
    autorestart: true,
    watch: false,
    max_memory_restart: "500M", // Otomatis restart jika RAM melebihi 1 GB
    exp_backoff_restart_delay: 100 // Jeda restart bertahap jika terus error
  }]
}
