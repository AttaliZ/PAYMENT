const express = require('express');
const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');
const bodyParser = require('body-parser');
const _ = require('lodash');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message, err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const UPLOAD_DIR = 'uploads/';
(async () => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log(`Upload directory ensured: ${UPLOAD_DIR}`);
    } catch (err) {
        console.error('Failed to create upload directory:', err.message);
        process.exit(1);
    }
})();

app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

let lastGeneratedQR = null;

const generateRandomDecimal = () => {
    return Math.floor(Math.random() * 5).toString().padStart(2, '0');
};

app.post('/generateQR', async (req, res) => {
    try {
        console.log('Received /generateQR request:', req.body);
        const amount = parseFloat(_.get(req, ['body', 'amount'], 0));

        if (isNaN(amount) || amount <= 0) {
            console.log('Invalid amount:', amount);
            return res.status(400).json({
                RespCode: 400,
                RespMassage: 'bad: Invalid amount'
            });
        }

        const decimalPart = generateRandomDecimal();
        const finalAmount = parseFloat(`${Math.floor(amount)}.${decimalPart}`);

        const mobileNumber = '0946737973';
        const payload = generatePayload(mobileNumber, { amount: finalAmount });
        const options = {
            color: {
                dark: '#000',
                light: '#FFF'
            }
        };

        const url = await QRCode.toDataURL(payload, options);
        console.log('QR code generated successfully with amount:', finalAmount);

        lastGeneratedQR = {
            amount: finalAmount.toFixed(2),
            decimalPart: decimalPart,
            mobileNumber,
            generatedAt: new Date()
        };

        return res.status(200).json({
            RespCode: 200,
            RespMassage: 'good',
            Result: url,
            Amount: finalAmount.toFixed(2)
        });
    } catch (err) {
        console.error('Error generating QR code:', err.message);
        return res.status(500).json({
            RespCode: 500,
            RespMassage: `bad: ${err.message}`
        });
    }
});

app.post('/upload-slip', upload.single('slip'), async (req, res) => {
    let filePath = '';
    try {
        console.log('Received /upload-slip request:', { body: req.body, file: req.file });

        const slipAmount = req.body.amount;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                slipAmount: slipAmount || '0.00',
                verification: {
                    isValid: false,
                    messages: ['ไม่พบไฟล์สลิป']
                }
            });
        }

        filePath = req.file.path;
        console.log('📥 Image uploaded at:', filePath);

        if (!slipAmount) {
            return res.status(400).json({
                success: false,
                slipAmount: '0.00',
                verification: {
                    isValid: false,
                    messages: ['ไม่พบจำนวนเงินจากสลิป']
                }
            });
        }

        const verificationResult = verifySlip({ amount: slipAmount });

        console.log('Sending response to frontend:', { success: true, slipAmount, verification: verificationResult });
        return res.json({
            success: true,
            slipAmount,
            verification: verificationResult
        });

    } catch (error) {
        console.error('🔥 SLIP PROCESSING ERROR:', error.message, error.stack);
        return res.status(500).json({
            success: false,
            slipAmount: req.body.amount || '0.00',
            verification: {
                isValid: false,
                messages: ['เกิดข้อผิดพลาดในการประมวลผลสลิป: ' + error.message]
            }
        });
    } finally {
        if (filePath) {
            try {
                const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                if (fileExists) {
                    await fs.unlink(filePath);
                    console.log('🗑️ File deleted:', filePath);
                } else {
                    console.log('File not found for deletion:', filePath);
                }
            } catch (err) {
                console.error('Error deleting file:', err.message);
            }
        }
    }
});

const verifySlip = (slipData) => {
    const verification = {
        isValid: true,
        messages: []
    };

    if (!lastGeneratedQR) {
        verification.isValid = false;
        verification.messages.push('⚠️ ยังไม่ได้สร้าง QR Code เพื่อเปรียบเทียบ');
        return verification;
    }

    const slipAmount = parseFloat(slipData.amount).toFixed(2);
    const slipDecimalPart = slipAmount.split('.')[1];

    if (slipDecimalPart !== lastGeneratedQR.decimalPart) {
        verification.isValid = false;
        verification.messages.push(
            `✗ เลขทศนิยมไม่ตรงกัน (QR: ${lastGeneratedQR.decimalPart}, สลิป: ${slipDecimalPart})`
        );
    } else {
        verification.messages.push('✓ เลขทศนิยมตรงกัน');
    }

    return verification;
};

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Trying another port`);
        app.listen(PORT + 1);
    } else {
        console.error('Server error:', err.message);
        process.exit(1);
    }
});

module.exports = app;