# 🤖 Facebook Page AI Chatbot (ขับเคลื่อนด้วย Google Gemini)

ระบบตอบแชตอัตโนมัติอัจฉริยะสำหรับ **Facebook Page Messenger** ที่เชื่อมต่อกับ **Google Gemini AI** สามารถตอบคำถามลูกค้า ปิดการขาย แนะนำสินค้า และตอบข้อสงสัยได้เสมือนแอดมินมืออาชีพ พร้อมระบบจดจำข้อมูลธุรกิจจากเอกสาร `knowledge.md`

---

## ✨ จุดเด่นของระบบนี้
1. **ตอบอย่างชาญฉลาดเป็นธรรมชาติ:** ใช้ Google Gemini AI (ฉลาดกว่าบอทแบบกดปุ่มทั่วไป)
2. **ปรับแต่งข้อมูลร้านค้าง่ายมาก:** เพียงแก้ไขไฟล์ `knowledge.md` ไม่จำเป็นต้องแตะโค้ด
3. **ระบบจำบริบทการคุย (Memory Context):** บอทจำข้อความที่คุยก่อนหน้าได้ ไม่ลืมคำถามก่อนหน้า
4. **แสดงสถานะกำลังพิมพ์ (Typing Indicator):** ลูกค้าจะเห็นจุด 3 จุด `...กำลังพิมพ์` ให้ความรู้สึกเหมือนคุยกับคนจริง
5. **มีโหมดทดสอบในเครื่องทันที (Test Simulator):** พิมพ์คุยทดสอบได้ใน Terminal โดยไม่ต้องรอต่อ Facebook

---

## 📁 โครงสร้างโปรเจกต์
```text
fb-ai-chatbot/
├── .env                  # ไฟล์เก็บคีย์ API ต่างๆ
├── .env.example          # ตัวอย่างการตั้งค่า Environment
├── knowledge.md          # 📄 ข้อมูลร้านค้า/สินค้า/โปรโมชั่น สำหรับให้ AI อ่าน
├── package.json          # รายการ Dependencies
├── server.js             # Webhook Server หลักสำหรับรับ-ส่งข้อมูลกับ Facebook
├── test-chat.js          # สคริปต์จำลองคุยกับ AI ใน Terminal
└── src/
    ├── gemini.js         # ระบบเชื่อมต่อ Google Gemini API
    ├── messenger.js      # ระบบส่งข้อความและ Action ผ่าน Facebook Graph API
    └── conversation.js   # ระบบเก็บประวัติการสนทนาของลูกค้าแต่ละคน
```

---

## 🚀 ขั้นตอนการติดตั้งและเริ่มต้นใช้งาน

### 1. รับ Gemini API Key (ฟรี)
1. เข้าไปที่ [Google AI Studio](https://aistudio.google.com/app/apikey)
2. ล็อกอินด้วยบัญชี Google แล้วกด **Create API key**
3. คัดลอก Key มาใส่ในไฟล์ `.env` ที่ช่อง `GEMINI_API_KEY`

---

### 2. ทดสอบคุยกับ AI ในเครื่องก่อน (ไม่ต้องรอต่อ Facebook)
พี่สามารถทดลองคุยกับบอทได้ทันทีผ่าน Terminal:
```bash
npm run test-chat
```
- ลองพิมพ์ถาม: *"มีคีย์บอร์ดอะไรบ้าง"*, *"ส่งฟรีกี่บาท"*, *"ขอเลขบัญชีหน่อย"*
- บอทจะนำข้อมูลจาก `knowledge.md` มาตอบทันที

---

### 3. ตั้งค่าเชื่อมต่อกับ Facebook Page

#### ขั้นตอนที่ 3.1: สร้าง App ใน Meta for Developers
1. เข้าเว็บ [Meta for Developers](https://developers.facebook.com/) และล็อกอิน
2. ไปที่ **My Apps (แอปของฉัน)** -> กด **Create App (สร้างแอป)**
3. เลือกประเภท Use Case: **Other** -> **Business** (หรือ Messenger)
4. ตั้งชื่อแอป เช่น `My-Shop-Chatbot` แล้วกดสร้าง

#### ขั้นตอนที่ 3.2: เชื่อมต่อ Messenger กับ Facebook Page
1. ในหน้าแดชบอร์ดของแอป มองหาหัวข้อ **Messenger** แล้วกด **Set Up (ตั้งค่า)**
2. เลื่อนลงมาที่หัวข้อ **Access Tokens (โทเค็นการเข้าถึง)**
3. กด **Add or remove Pages (เพิ่มหรือลบเพจ)** แล้วเลือกเพจ Facebook ที่ต้องการให้บอทไปตอบ
4. กด **Generate Token (สร้างโทเค็น)** แล้วคัดลอก Token นั้นมาใส่ในไฟล์ `.env` ที่ช่อง:
   ```env
   PAGE_ACCESS_TOKEN=วาง_Token_ตรงนี้
   ```

#### ขั้นตอนที่ 3.3: เปิดเซิร์ฟเวอร์และทำ Public HTTPS URL (สำหรับทดสอบในเครื่อง)
Facebook กำหนดว่า Webhook URL ต้องเป็น **HTTPS** เท่านั้น หากรันบนเครื่องตัวเอง แนะนำให้ใช้ `ngrok` หรือ `cloudflared`:

1. เปิดเซิร์ฟเวอร์แชตบอท:
   ```bash
   npm start
   ```
2. เปิด Terminal อีกหน้าต่าง แล้วรัน ngrok เพื่อเปิดพอร์ต 3000:
   ```bash
   npx ngrok http 3000
   ```
   *(จะได้ลิงก์ เช่น `https://xxxx-xx-xx.ngrok-free.app`)*

#### ขั้นตอนที่ 3.4: ตั้งค่า Webhooks ใน Meta Dashboard
1. กลับมาที่หน้า **Messenger > Settings** ใน Meta for Developers
2. ในหัวข้อ **Webhooks** กด **Add Callback URL (เพิ่ม URL สำหรับโทรกลับ)**:
   - **Callback URL:** `https://xxxx-xx-xx.ngrok-free.app/webhook` (ใส่ลิงก์ ngrok ตามด้วย `/webhook`)
   - **Verify Token:** ให้ใส่ข้อความลับที่ตรงกับ `VERIFY_TOKEN` ในไฟล์ `.env` (เช่น `my_facebook_webhook_verify_token`)
3. กด **Verify and save (ตรวจสอบและบันทึก)** -> ระบบจะขึ้นเครื่องหมายถูกสีเขียว ✅
4. ในตาราง Webhook Fields ให้กด **Edit Subscriptions** แล้วติ๊กถูกที่:
   - `messages` (รับข้อความแชต)
   - `messaging_postbacks` (รับการกดปุ่มเมนู)
5. อย่าลืมเลือกเพจในช่อง **Select a Page to subscribe to Webhook events** แล้วกด **Subscribe**

---

### 4. ทดสอบทักแชตในเพจจริง
- ใช้ Facebook ส่วนตัวทักแชตเข้าไปที่เพจ
- AI จะอ่านข้อความ แสดงสถานะกำลังพิมพ์ และตอบกลับอัตโนมัติทันที! 🎉

---

## 📝 วิธีปรับแต่งข้อมูลสินค้า/ร้านค้า
เปิดไฟล์ `knowledge.md` แล้วพิมพ์แก้ไขได้เลย:
- ใส่ชื่อร้าน เวลาเปิด-ปิด
- รายการสินค้า สเปก ราคา สีที่มี
- นโยบายการเคลมสินค้า การจัดส่ง เลขบัญชีธนาคาร
- ทุกครั้งที่เซฟไฟล์ ระบบจะนำข้อมูลใหม่ไปตอบลูกค้าทันที!

---

## 🌐 การนำขึ้น Cloud รันออนไลน์ 24 ชั่วโมง
เมื่อพร้อมเปิดใช้งานจริง แนะนำนำโค้ดขึ้นบริการ Cloud ฟรีหรือราคาประหยัด เช่น:
- [Render.com](https://render.com) (มี Web Service ฟรี และมี HTTPS อัตโนมัติ)
- [Railway.app](https://railway.app)
- Cloud VPS (DigitalOcean / Lightsail / Linode)

เมื่อได้ URL โดเมนจาก Cloud (เช่น `https://my-bot.onrender.com`) เพียงนำ URL นั้นไปแทนที่ใน Callback URL ของ Facebook Webhooks ก็พร้อมให้บริการตลอด 24 ชั่วโมงโดยไม่ต้องเปิดคอมทิ้งไว้ครับ!
