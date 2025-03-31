# QR Payment System

ระบบ QR Payment System เป็นแอปพลิเคชันเว็บที่ช่วยให้ผู้ใช้สามารถสร้าง QR Code สำหรับการชำระเงินผ่าน PromptPay และตรวจสอบสลิปการโอนเงินเพื่อเพิ่มเครดิตในระบบได้อย่างสะดวก รองรับการอัปโหลดภาพสลิปและการวิเคราะห์ข้อมูลด้วย OCR (Optical Character Recognition) เพื่อตรวจสอบความถูกต้องของการชำระเงิน

## เว็บนี้ทำอะไรได้บ้าง
1. **สร้าง QR Code**: สร้าง QR Code สำหรับชำระเงินตามจำนวนเงินที่ผู้ใช้ระบุ
2. **ตรวจสอบสลิป**: อัปโหลดภาพสลิปเพื่อตรวจสอบจำนวนเงินและความถูกต้อง
3. **จัดการเครดิต**: เพิ่มเครดิตในระบบเมื่อการตรวจสอบสลิปสำเร็จ

## เทคโนโลยีและเครื่องมือที่ใช้
### Frontend
- **HTML5/CSS3/JavaScript**: พัฒนา UI และ logic ของหน้าเว็บ
- **Tesseract.js (v5.1.0)**: ใช้ OCR เพื่ออ่านข้อความจากภาพสลิป โดยเฉพาะจำนวนเงิน
- **Fetch API**: ทำ backend ผ่าน HTTP requests (POST)
- **LocalStorage**: เก็บข้อมูลเครดิตของผู้ใช้ในฝั่ง client

### Backend
- **Node.js**: รัน server-side logic
- **Express.js**: Framework สำหรับสร้าง RESTful API
- **Multer**: จัดการการอัปโหลดไฟล์ภาพสลิป
- **promptpay-qr**: สร้าง payload สำหรับ QR Code
- **qrcode**: แปลง payload เป็นภาพ QR Code
- **fs.promises**: จัดการไฟล์ในระบบ 
- **CORS**: ให้ frontend (port 5500) ใช้ backend (port 3000)
- **Lodash**: ช่วยจัดการข้อมูลใน request body

### HOW TO RUN?
- **Live Server**: รัน frontend ที่ `http://127.0.0.1:5500` (แนะนำให้ใช้ VS Code extension)
- **Node.js Runtime**: รัน backend ที่ `http://localhost:3000`

## การติดตั้งและรันโปรเจกต์
### เริ่มต้น
- ติดตั้ง [Node.js](https://nodejs.org/) (แนะนำ v18.x หรือสูงกว่า)
- ติดตั้ง VS Code และ extension "Live Server" (สำหรับรัน frontend)

## โครงสร้างระบบ (Architecture Diagram)
```mermaid
graph TD
    A[User] -->|Access| B[Frontend<br>HTML/CSS/JS<br>Tesseract.js<br>LocalStorage]
    B -->|POST /generateQR| C[Backend<br>Node.js/Express<br>promptpay-qr<br>qrcode]
    B -->|POST /upload-slip| C
    C -->|Save/Delete Files| D[Filesystem<br>uploads/]
    B -->|Store Credit| E[LocalStorage]

