// scripts/replyPendingMessages.js
// สคริปต์กวาดตอบข้อความลูกค้าเก่าที่ค้างอยู่ทั้งหมดโดยอัตโนมัติ

import dotenv from 'dotenv';
dotenv.config();

import { getAiReply } from '../src/gemini.js';
import { sendTextMessage, sendAttachmentMessage, sendSenderAction } from '../src/messenger.js';

const PAGE_ID = '1320277404483712';
const token = process.env.PAGE_ACCESS_TOKEN;

const ATTACHMENT_PRICE_PROMO = '1709619427544991';  // รูปโปรโมชั่นราคา
const ATTACHMENT_REVIEW_NECK = '2391971784876972';  // รูปรีวิวก่อน-หลัง 1
const ATTACHMENT_REVIEW_NECK2 = '1129565523305184'; // รูปรีวิวก่อน-หลัง 2

async function replyPending() {
  console.log('🔍 กำลังดึงรายการแชตที่ค้างอยู่จาก Facebook...');
  const url = `https://graph.facebook.com/v21.0/me/conversations?fields=id,unread_count,updated_time,senders,messages.limit(5){message,from,created_time,attachments}&access_token=${token}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.data) {
    console.error('Error fetching conversations:', data);
    return;
  }

  console.log(`พบแชตทั้งหมด ${data.data.length} รายการ กำลังตรวจสอบข้อความที่ต้องตอบ...`);

  let repliedCount = 0;

  for (const convo of data.data) {
    const messages = convo.messages?.data || [];
    if (messages.length === 0) continue;

    // หาข้อความล่าสุดในแชต
    const latestMsg = messages[0];
    
    // หาผู้ส่งที่เป็นลูกค้า (ไม่ใช่เพจ)
    const customerSender = convo.senders?.data?.find(s => s.id !== PAGE_ID);
    if (!customerSender) continue;

    const customerPsid = customerSender.id;
    const customerName = customerSender.name;

    // ตรวจสอบว่าข้อความล่าสุดส่งมาจากลูกค้าหรือไม่ (หรือเพจเพิ่งส่งแค่ข้อความบรอดแคสต์อัตโนมัติของโฆษณา)
    const isLatestFromCustomer = latestMsg.from?.id !== PAGE_ID;
    
    // หาข้อความล่าสุดที่ลูกค้าเคยพิมพ์เข้ามา
    const latestCustomerMsgObj = messages.find(m => m.from?.id !== PAGE_ID);
    const customerText = latestCustomerMsgObj?.message || 'ສະບາຍດີ ສົນໃຈສິນຄ້າ';

    // ถ้าข้อความล่าสุดมาจากลูกค้า แปลว่ายังไม่ได้ตอบ!
    if (isLatestFromCustomer) {
      console.log(`\n👉 กำลังตอบ [${customerName}] (ID: ${customerPsid}): "${customerText}"`);

      await sendSenderAction(customerPsid, 'mark_seen');
      await sendSenderAction(customerPsid, 'typing_on');

      try {
        const aiReply = await getAiReply(customerPsid, customerText);
        console.log(`🤖 AI ตอบ: ${aiReply}`);

        await sendSenderAction(customerPsid, 'typing_off');
        await sendTextMessage(customerPsid, aiReply);

        // ตรวจสอบว่าถามราคาหรือไม่ -> ส่งรูปราคา
        const isAskingPrice = customerText.includes('ລາຄາ') || 
                              customerText.includes('ໂປຣ') || 
                              customerText.includes('ເທົ່າໃດ') || 
                              customerText.includes('ທໍໃດ') || 
                              customerText.includes('ราคา') || 
                              customerText.includes('เท่าไหร่');

        if (isAskingPrice) {
          console.log(`📸 ส่งรูปภาพโปรโมชั่นราคาให้ [${customerName}]`);
          await sendAttachmentMessage(customerPsid, ATTACHMENT_PRICE_PROMO);
        }

        // ตรวจสอบว่าขอดูรีวิวหรือไม่ -> ส่งรูปรีวิว
        const isAskingReview = customerText.includes('ລີວິວ') || 
                               customerText.includes('ຣີວິວ') || 
                               customerText.includes('ລີວຶວ') || 
                               customerText.includes('ຮູບ') || 
                               customerText.includes('รีวิว');

        if (isAskingReview) {
          console.log(`📸 ส่งรูปภาพรีวิวให้ [${customerName}]`);
          await sendAttachmentMessage(customerPsid, ATTACHMENT_REVIEW_NECK);
        }

        repliedCount++;
        // หน่วงเวลาสั้นๆ 1 วินาที เพื่อความเป็นธรรมชาติและไม่ให้โดน Rate Limit
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`❌ เกิดข้อผิดพลาดกับ [${customerName}]:`, err.message);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 ตอบข้อความลูกค้าเก่าที่ค้างอยู่สำเร็จทั้งหมด ${repliedCount} รายการ!`);
  console.log(`========================================`);
}

replyPending();
