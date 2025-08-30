const express = require('express');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Untuk mengizinkan koneksi dari website

// ======= CONFIG =======
const TELEGRAM_TOKEN = "7771429262:AAHwRR2VVM0Wlh1LWsmk9V3ZRifx8RZUU9Y"; 
const VERCEL_TOKEN = "EVq9RrIByi1QVqjXsRmKcoAm''
const ADMIN_ID = 6878949999; // Ganti dengan ID Telegram admin
const BOT_USERNAME = 'Botbugnewincis_bot'; 

// ======= BOT INIT & EXPRESS =======
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const app = express();
const upload = multer({ dest: 'uploads/' }); // Folder sementara untuk menyimpan file yang diunggah

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint API untuk menerima permintaan dari website
app.post('/deploy', upload.single('projectZip'), async (req, res) => {
    const { domainName, userId } = req.body;
    const file = req.file;

    if (!file || !domainName || !userId) {
        if (file) fs.unlinkSync(file.path);
        const errorMsg = 'Data tidak lengkap. File, nama domain, dan ID user diperlukan.';
        await bot.sendMessage(ADMIN_ID, `❌ Gagal deploy: ${errorMsg}`);
        return res.status(400).json({ error: errorMsg });
    }

    try {
        const zipFile = fs.readFileSync(file.path);
        const zipBase64 = zipFile.toString('base64');
        const projectName = domainName.toLowerCase().replace(/\s+/g, '-');

        const payload = {
            name: projectName,
            files: [
                // Catatan: Vercel membutuhkan struktur proyek yang tidak di-ZIP.
                // Anda harus mengunggah file-file proyek secara terpisah, bukan dalam ZIP.
                // Contoh: { file: 'index.html', data: '...base64...' }
                // Untuk demo, kita kirim ZIP tapi ini TIDAK akan berhasil di Vercel.
                // Ini hanya untuk menunjukkan alur koneksi.
                { file: 'project.zip', data: zipBase64, encoding: 'base64' }
            ],
            projectSettings: {
                framework: 'static'
            }
        };

        // Permintaan ke Vercel (ini akan gagal karena Vercel tidak menerima ZIP)
        // Anda perlu memodifikasi ini untuk mengunggah file yang tidak di-ZIP
        // await axios.post('https://api.vercel.com/v13/deployments', payload, {
        //     headers: {
        //         Authorization: `Bearer ${VERCEL_TOKEN}`,
        //         'Content-Type': 'application/json'
        //     }
        // });
        
        // --- SIMULASI DEPLOYMENT VERCEL ---
        console.log("Mencoba deploy ke Vercel...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        const finalUrl = `https://${projectName}.vercel.app`;
        // --- END SIMULASI ---

        const messageToAdmin = `✅ Website baru berhasil di-deploy dari web!\n` +
                              `Nama: ${projectName}\n` +
                              `Link: ${finalUrl}\n` +
                              `Diunggah oleh user: ${userId}`;
        bot.sendMessage(ADMIN_ID, messageToAdmin);
        
        const messageToUser = `✅ Website Anda berhasil di-deploy!\nLink: ${finalUrl}`;
        bot.sendMessage(userId, messageToUser);

        fs.unlinkSync(file.path); // Hapus file dari server
        res.json({ success: true, url: finalUrl });

    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        const errorMsg = err.response?.data?.error?.message || err.message;
        bot.sendMessage(ADMIN_ID, `❌ Gagal deploy website:\n${errorMsg}`);
        res.status(500).json({ error: errorMsg });
    }
});

// Anda bisa tetap menggunakan kode bot Telegram yang sudah ada di bawah ini
// untuk menangani perintah lain seperti /start, /prem, dll.
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Selamat datang di bot deploy!');
});
// ... (Tambahkan kembali handler bot lainnya di sini) ...

// Menjalankan server web
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server web berjalan di port ${PORT}`);
});
