// server.js
// Facebook Page AI Chatbot Webhook Server

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import { getAiReply, loadKnowledge } from './src/gemini.js';
import { sendTextMessage, sendImageMessage, sendAttachmentMessage, sendSenderAction } from './src/messenger.js';

// Facebook Official Attachment IDs (ฝากรูปไว้บนระบบ Facebook โดยตรง รวดเร็ว แม่นยำ 100%)
const ATTACHMENT_PRICE_PROMO = '1709619427544991';  // รูปโปรโมชั่นราคา
const ATTACHMENT_REVIEW_NECK = '2391971784876972';  // รูปรีวิวก่อน-หลัง 1
const ATTACHMENT_REVIEW_NECK2 = '1129565523305184'; // รูปรีวิวก่อน-หลัง 2 (รูปใหม่ล่าสุด)
const ATTACHMENT_BCEL_QR = '29562296090050097';     // รูป QR Code BCEL One

const app = express();
const PORT = process.env.PORT || 3000;

// แคชป้องกันการตอบข้อความซ้ำ (Message Deduplication Cache)
const processedMids = new Set();

app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// หน้าแรกแสดงสถานะของระบบ
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 650px; margin: 40px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #0866FF;">🚀 Facebook Page AI Chatbot กำลังทำงาน</h2>
      <p>ระบบพร้อมรับ Webhook จาก Facebook Messenger และเชื่อมต่อกับ Google Gemini แล้วครับ</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
      <h4>สถานะการตั้งค่า:</h4>
      <ul>
        <li><strong>GEMINI_API_KEY:</strong> ${process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_') ? '✅ ตั้งค่าแล้ว' : '⚠️ ยังไม่ได้ใส่ใน .env'}</li>
        <li><strong>PAGE_ACCESS_TOKEN:</strong> ${process.env.PAGE_ACCESS_TOKEN && !process.env.PAGE_ACCESS_TOKEN.includes('your_') ? '✅ ตั้งค่าแล้ว' : '⚠️ ยังไม่ได้ใส่ใน .env'}</li>
        <li><strong>VERIFY_TOKEN:</strong> ${process.env.VERIFY_TOKEN ? '✅ ' + process.env.VERIFY_TOKEN : '⚠️ ยังไม่ได้ตั้งค่า'}</li>
      </ul>
      <p style="color: #666; font-size: 14px;">Webhook URL สำหรับใส่ใน Meta for Developers: <code>https://YOUR_DOMAIN/webhook</code></p>
    </div>
  `);
});

// 1. Webhook Verification (Meta จะส่งคำขอนี้มาเพื่อยืนยันระบบตอนกด Verify and Save)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedVerifyToken = process.env.VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedVerifyToken) {
      console.log('✅ Webhook Verified สำเร็จ!');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ Verify Token ไม่ตรงกัน:', token);
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 2. รับข้อความแชตจาก Facebook Messenger
app.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('🔔 [WEBHOOK POST RECEIVED]:', JSON.stringify(body, null, 2));

  // ตรวจสอบว่า Event มาจาก Facebook Page หรือไม่
  if (body.object === 'page') {
    // ต้องตอบกลับ 200 OK ให้ Facebook ภายใน 20 วินาที เพื่อป้องกัน Facebook ส่งข้อความซ้ำ
    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry || []) {
      for (const webhookEvent of entry.messaging || []) {
        const senderPsid = webhookEvent.sender?.id;
        const message = webhookEvent.message;

        // ไม่ประมวลผลข้อความ echo ที่เพจส่งเอง หรือข้อความจากตัวเพจเอง
        if (message?.is_echo || senderPsid === '1320277404483712') {
          continue;
        }

        // ป้องกันการประมวลผลข้อความซ้ำ (Deduplication)
        const mid = message?.mid || `${senderPsid}_${webhookEvent.timestamp}`;
        if (processedMids.has(mid)) {
          console.log(`⏩ ข้ามข้อความซ้ำ [${mid}]`);
          continue;
        }
        processedMids.add(mid);
        setTimeout(() => processedMids.delete(mid), 10 * 60 * 1000);

        // ตรวจสอบข้อความ หรือการกดปุ่มคำถาม (Postback)
        let userText = message ? message.text : null;
        if (!userText && webhookEvent.postback) {
          userText = webhookEvent.postback.title || webhookEvent.postback.payload;
        }

        if (userText) {
          console.log(`📩 ได้รับข้อความจาก [${senderPsid}]: ${userText}`);

        // ส่ง Action: อ่านแล้ว + กำลังพิมพ์...
        await sendSenderAction(senderPsid, 'mark_seen');
        await sendSenderAction(senderPsid, 'typing_on');

        try {
          // ดึงคำตอบจาก Gemini AI
          const aiReply = await getAiReply(senderPsid, userText);
          console.log(`🤖 AI ตอบกลับ [${senderPsid}]: ${aiReply}`);

          // ปิดสถานะกำลังพิมพ์ และส่งข้อความตอบกลับ
          await sendSenderAction(senderPsid, 'typing_off');
          await sendTextMessage(senderPsid, aiReply);

          const lowerText = userText.toLowerCase();

          // 1. ตรวจสอบว่าลูกค้าถามราคา หรือโปรโมชั่นหรือไม่ -> ส่งรูปตารางโปรโมชั่นราคา
          const isAskingPrice = userText.includes('ລາຄາ') || 
                                userText.includes('ໂປຣ') || 
                                userText.includes('ເທົ່າໃດ') || 
                                userText.includes('ราคา') || 
                                userText.includes('โปร') || 
                                userText.includes('เท่าไหร่') ||
                                lowerText.includes('price');

          // ถ้าลูกค้าเพิ่งแจ้งสั่งซื้อ (มีเบอร์โทรหรือที่อยู่) เราจะไม่ส่งรูปราคาซ้ำ
          const isOrdering = userText.includes('020') || userText.includes('030') || userText.includes('ບ້ານ') || userText.includes('ແຂວງ') || userText.includes('ສົ່ງແດ່');

          if (isAskingPrice && !isOrdering) {
            console.log(`📸 ส่งรูปภาพโปรโมชั่นราคาให้ลูกค้า [${senderPsid}] (Attachment ID: ${ATTACHMENT_PRICE_PROMO})`);
            await sendAttachmentMessage(senderPsid, ATTACHMENT_PRICE_PROMO);
          }

          // 2. ตรวจสอบว่าลูกค้าขอดูรีวิวหรือไม่ -> ส่งรูปภาพรีวิวก่อน-หลัง
          const isAskingReview = userText.includes('ລີວິວ') || 
                                 userText.includes('ຣີວິວ') || 
                                 userText.includes('ລີວຶວ') || 
                                 userText.includes('ຣີວຶວ') || 
                                 userText.includes('ຮູບລີວິວ') || 
                                 userText.includes('ຮູບລີວຶວ') || 
                                 userText.includes('ຮູບ') || 
                                 userText.includes('รีวิว') || 
                                 lowerText.includes('review');

          if (isAskingReview) {
            console.log(`📸 ส่งรูปภาพรีวิวให้ลูกค้า [${senderPsid}]`);
            await sendAttachmentMessage(senderPsid, ATTACHMENT_REVIEW_NECK);
            await sendAttachmentMessage(senderPsid, ATTACHMENT_REVIEW_NECK2);
          }

          // 3. ตรวจสอบว่าลูกค้าเลือกโอนเงิน หรือขอ QR Code หรือไม่ -> ส่งรูป QR Code BCEL One
          const isAskingTransfer = userText.includes('ໂອນ') || 
                                   userText.includes('โอน') || 
                                   userText.includes('ເລກບັນຊີ') || 
                                   userText.includes('เลขบัญชี') || 
                                   lowerText.includes('qr') || 
                                   lowerText.includes('bcel');

          if (isAskingTransfer) {
            console.log(`📸 ส่งรูปภาพ QR Code BCEL One ให้ลูกค้า [${senderPsid}] (Attachment ID: ${ATTACHMENT_BCEL_QR})`);
            await sendAttachmentMessage(senderPsid, ATTACHMENT_BCEL_QR);
          }
        } catch (error) {
          console.error('❌ เกิดข้อผิดพลาดในการประมวลผลข้อความ:', error);
          await sendSenderAction(senderPsid, 'typing_off');
          await sendTextMessage(senderPsid, 'ສະບາຍດີເຈົ້າ! ຍິນດີຕ້ອນຮັບສູ່ຮ້ານ Sumifun Lipoma Cream ດຽວນີ້ແອດມິນກຳລັງກວດສອບຂໍ້ມູນໃຫ້ເດີ້ເຈົ້າ ສົນໃຈສອບຖາມລາຄາ ຫຼື ໂປຣໂມຊັ່ນຕົວໃດແຈ້ງໄວ້ໄດ້ເລີຍຈ້າ 🙏✨');
        }
      }
    }
  }
} else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Facebook AI Chatbot Webhook Server เริ่มทำงานแล้ว!`);
  console.log(`📡 URL ภายในเครื่อง: http://localhost:${PORT}`);
  console.log(`🔗 Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`===============================================`);
  console.log(`💡 ข้อมูลร้านค้าถูกโหลดจาก: knowledge.md`);
});
