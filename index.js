const express = require('express');
const axios = require('axios');
const path = require('path');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

app.use(express.json());

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

router.post('/check-whatsapp', async (req, res) => {
    const numbers = req.body.numbers;
    if (!Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Input harus berupa array nomor.' });
    }

    const results = await Promise.all(numbers.map(async (originalNumber) => {
        let isRegistered = false;
        let profilePicUrl = "https://i.ibb.co/pLgQkYp/wa-default-avatar.png"; 

        try {
            let cleanNumber = originalNumber.replace(/\D/g, '');
            if (cleanNumber.startsWith('0')) {
                cleanNumber = '62' + cleanNumber.substring(1);
            }
            
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
    }));

    res.json(results);
});

app.use('/.netlify/functions/server', router);
module.exports.handler = serverless(app);
