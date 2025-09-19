const express = require('express');
const axios = require('axios');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

app.use(express.json());

// Serve the HTML file directly
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the router for both local server and Netlify function paths
app.use(router);
app.use('/.netlify/functions/server', router);

// Core function to check a single WhatsApp number.
const checkWhatsAppNumber = async (originalNumber) => {
    let isRegistered = false;
    let profilePicUrl = "https://i.ibb.co/pLgQkYp/wa-default-avatar.png";

    // Normalize number to an internationally usable format
    let cleanNumber = originalNumber.replace(/\D/g, '');

    // Handle Indonesian numbers starting with '0'
    if (cleanNumber.startsWith('0') && cleanNumber.length > 5) {
        cleanNumber = '62' + cleanNumber.substring(1);
    }
    
    // Add a check for valid length before making the request
    if (cleanNumber.length < 9) {
        return { originalNumber, isRegistered: false, profilePicUrl, error: "Nomor tidak valid." };
    }

    try {
        const response = await axios.head(`https://wa.me/${cleanNumber}`, {
            maxRedirects: 0,
            timeout: 5000
        });

        isRegistered = (response.status === 200);
    } catch (error) {
        isRegistered = (error.response && error.response.status === 404) ? false : false;
    }

    return {
        originalNumber,
        isRegistered,
        profilePicUrl
    };
};

// WhatsApp checking API endpoint
router.post('/check-whatsapp', async (req, res) => {
    const numbers = req.body.numbers;
    if (!Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Input harus berupa array nomor.' });
    }

    const results = await Promise.all(numbers.map(checkWhatsAppNumber));
    res.json(results);
});

// This part is for running the server on a regular Node.js environment
if (process.env.NODE_ENV !== 'production' || !process.env.LAMBDA_TASK_ROOT) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

// Export the handler for Netlify serverless functions
module.exports.handler = serverless(app);
