// server.js
// Facebook Page AI Chatbot Webhook & Real-Time Inbox Sync Server

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dns from 'node:dns';

// บังคับ DNS IPv4 เป็นหลักเพื่อความเร็วและความเสถียร
dns.setDefaultResultOrder('ipv4first');

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
const ATTACHMENT_BCEL_QR = '1673666074415434';     // รูป QR Code BCEL One (เวอร์ชันใหม่สีแดง Scan to pay)
const PAGE_ID = process.env.PAGE_ID || '1320277404483712';

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
      <p>ระบบพร้อมรับ Webhook และ Real-Time Inbox Sync จาก Facebook Messenger เชื่อมต่อกับ Google Gemini 24 ชม.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
      <h4>สถานะการตั้งค่า:</h4>
      <ul>
        <li><strong>PAGE_ID:</strong> ${PAGE_ID}</li>
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

// ฟังก์ชันหลักในการประมวลผลและตอบกลับข้อความ (ใช้ร่วมกันทั้ง Webhook และ Inbox Sync)
async function handleIncomingMessage(senderPsid, userText, mid) {
  if (!userText || !senderPsid) return;

  // ป้องกันการประมวลผลซ้ำ
  if (processedMids.has(mid)) {
    return;
  }
  processedMids.add(mid);
  setTimeout(() => processedMids.delete(mid), 10 * 60 * 1000);

  console.log(`📩 กำลังประมวลผลข้อความจาก [${senderPsid}]: ${userText}`);

  // ส่ง Action: อ่านแล้ว + กำลังพิมพ์...
  await sendSenderAction(senderPsid, 'mark_seen');
  await sendSenderAction(senderPsid, 'typing_on');

  try {
    // ดึงคำตอบจาก Gemini AI (ภาษาลาว 100% พร้อมจิตวิทยาปิดการขาย)
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

// 2. รับข้อความแชตจาก Facebook Webhook
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry || []) {
      for (const webhookEvent of entry.messaging || []) {
        const senderPsid = webhookEvent.sender?.id;
        const message = webhookEvent.message;

        // ไม่ประมวลผลข้อความ echo ที่เพจส่งเอง หรือข้อความจากตัวเพจเอง
        if (message?.is_echo || senderPsid === PAGE_ID) {
          continue;
        }

        let userText = message ? message.text : null;
        if (!userText && webhookEvent.postback) {
          userText = webhookEvent.postback.title || webhookEvent.postback.payload;
        }

        if (userText) {
          const mid = message?.mid || `${senderPsid}_${webhookEvent.timestamp}`;
          await handleIncomingMessage(senderPsid, userText, mid);
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

// 3. ระบบ Real-Time Inbox Sync Engine (ดักจับข้อความลูกค้าทุกคน 100% แม้ Meta Webhook ไม่ส่งมาในโหมดพัฒนา)
let isSyncing = false;

async function syncInbox() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const token = process.env.PAGE_ACCESS_TOKEN;
    if (!token || token.includes('your_')) return;

    const url = `https://graph.facebook.com/v21.0/${PAGE_ID}/conversations?fields=id,updated_time,participants,messages.limit(2){id,created_time,from,message}&limit=10&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    const now = Date.now();
    for (const conv of data.data || []) {
      const customer = conv.participants?.data?.find(p => p.id !== PAGE_ID);
      const lastMsg = conv.messages?.data?.[0];

      if (!customer || !lastMsg) continue;

      // ตรวจสอบว่าเป็นข้อความจากลูกค้า (ไม่ใช่เพจส่งเอง)
      if (lastMsg.from?.id !== PAGE_ID && lastMsg.message) {
        const mid = lastMsg.id;

        // ถ้าประมวลผลข้อความนี้ไปแล้ว ให้ข้าม
        if (processedMids.has(mid)) continue;

        // กรองเฉพาะข้อความที่ส่งมาไม่เกิน 20 นาที เพื่อไม่ให้ไปทักข้อความเก่าค้างคืน
        const msgTime = new Date(lastMsg.created_time).getTime();
        if (now - msgTime > 20 * 60 * 1000) {
          processedMids.add(mid);
          continue;
        }

        console.log(`📥 [Inbox Sync] ตรวจพบข้อความใหม่จากลูกค้า ${customer.name} (${customer.id}): "${lastMsg.message}"`);
        await handleIncomingMessage(customer.id, lastMsg.message, mid);
      }
    }
  } catch (err) {
    console.error('⚠️ Inbox sync error:', err.message);
  } finally {
    isSyncing = false;
  }
}

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Facebook AI Chatbot Server เริ่มทำงานแล้ว!`);
  console.log(`📡 URL ภายในเครื่อง: http://localhost:${PORT}`);
  console.log(`🔗 Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`===============================================`);
  console.log(`💡 ข้อมูลร้านค้าถูกโหลดจาก: knowledge.md`);

  // เริ่มต้น Inbox Auto-Sync Engine ทุก 5 วินาที
  console.log(`🔄 เริ่มต้นระบบ Inbox Sync Engine (ดักจับข้อความลูกค้าทุกคนแบบเรียลไทม์)...`);
  setInterval(syncInbox, 5000);
  setTimeout(syncInbox, 2000);
});
