document.getElementById('deployForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const statusDiv = document.getElementById('status');
    const formData = new FormData();
    const projectFile = document.getElementById('projectZip').files[0];
    const domainName = document.getElementById('domainName').value;

    // Ganti nilai ini dengan ID Telegram Admin/User yang akan menerima notifikasi
    // Anda bisa membuatnya dinamis jika punya sistem login
    const userId = '1361715449'; 

    if (!projectFile || !domainName) {
        statusDiv.textContent = 'Semua field harus diisi!';
        statusDiv.className = 'mt-6 p-4 rounded-xl text-center bg-red-800 text-white block';
        return;
    }

    formData.append('projectZip', projectFile);
    formData.append('domainName', domainName);
    formData.append('userId', userId); // Mengirim ID user ke backend

    statusDiv.textContent = 'Memulai proses deploy... Silakan tunggu.';
    statusDiv.className = 'mt-6 p-4 rounded-xl text-center bg-yellow-800 text-white block';

    try {
        // Ganti URL ini dengan URL domain atau IP server tempat server.js Anda berjalan
        const response = await fetch('http://alamat-ip-atau-domain-server-anda:3000/deploy', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = `✅ Deploy berhasil! Notifikasi akan dikirimkan ke bot Telegram.`;
            statusDiv.className = 'mt-6 p-4 rounded-xl text-center bg-green-800 text-white block';
        } else {
            throw new Error(result.error || 'Terjadi kesalahan pada server.');
        }

    } catch (error) {
        statusDiv.textContent = `❌ Gagal deploy: ${error.message}`;
        statusDiv.className = 'mt-6 p-4 rounded-xl text-center bg-red-800 text-white block';
    }
});
