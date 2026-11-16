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
import { sendTextMessage, sendSenderAction } from './src/messenger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
      const webhookEvent = entry.messaging?.[0];
      if (!webhookEvent) continue;

      const senderPsid = webhookEvent.sender?.id;
      const message = webhookEvent.message;

      // ตรวจสอบข้อความ หรือการกดปุ่มคำถาม (Postback)
      let userText = message && !message.is_echo ? message.text : null;
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
        } catch (error) {
          console.error('❌ เกิดข้อผิดพลาดในการประมวลผลข้อความ:', error);
          await sendSenderAction(senderPsid, 'typing_off');
          await sendTextMessage(senderPsid, 'ขออภัยค่ะ เกิดข้อผิดพลาดชั่วคราว เจ้าหน้าที่จะรีบเข้ามาดูแลนะคะ');
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
