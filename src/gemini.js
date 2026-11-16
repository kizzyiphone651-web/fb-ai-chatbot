// src/gemini.js
// ระบบคุยกับ Google Gemini AI พร้อมความรู้จาก knowledge.md

import fs from 'fs';
import path from 'path';
import dns from 'node:dns';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { conversationManager } from './conversation.js';

// กำหนดให้ DNS ตอบกลับ IPv4 เป็นหลักเพื่อป้องกันปัญหา IPv6 หลุดการเชื่อมต่อบน Mac
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const KNOWLEDGE_PATH = path.resolve(__dirname, '../knowledge.md');

// ฟังก์ชันโหลดข้อมูลร้านค้าจาก knowledge.md
export function loadKnowledge() {
  try {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      return fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
    }
  } catch (err) {
    console.error('⚠️ ไม่สามารถอ่านไฟล์ knowledge.md ได้:', err.message);
  }
  return 'คุณคือผู้ช่วยตอบแชตอัตโนมัติสำหรับเพจ Facebook ให้บริการด้วยความสุภาพและเป็นมิตร';
}

// ฟังก์ชันส่งข้อความคุยกับ Gemini
export async function getAiReply(userId, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return 'ขออภัยค่ะ ขณะนี้ระบบ AI ยังไม่ได้ใส่ GEMINI_API_KEY กรุณาตั้งค่าในไฟล์ .env ก่อนนะคะ';
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const knowledge = loadKnowledge();

  const systemInstruction = `คุณคือ "แอดมิน AI" ประจำเพจ Facebook
จงตอบคำถามลูกค้าอย่างเป็นกันเอง สุภาพ และ "ตอบสั้นกระชับ ตรงประเด็น สไตล์แชต ไม่พิมพ์ยาวเกินไป" (ไม่เกิน 2-4 บรรทัดต่อข้อความ)

===== [ข้อมูลสินค้าและราคา] =====
${knowledge}
==============================

กฎเหล็กในการตอบ:
1. "ตอบสั้นและกระชับเสมอ" ห้ามตอบยาวเป็นบทความ ลูกค้าถามราคา ให้บอกราคาและโปร 2 แถม 1 / 3 แถม 2 สั้นๆ ทันที
2. ตอบภาษาเดียวกับลูกค้า (ลูกค้าทักลาว ตอบลาว, ลูกค้าทักไทย ตอบไทย)
3. เมื่อลูกค้าแจ้งสั่งซื้อ ส่งที่อยู่ หรือเบอร์โทร ให้พิมพ์ตอบรับออเดอร์อย่างกระชับ เช่น:
   "รับออเดอร์เรียบร้อยค่ะ ขอบใจหลายๆ เด้อ ทางร้านจะรีบจัดส่งและแจ้งบิลให้ทันทีค่ะ 🙏✨"`;

  // ดึงประวัติการคุยเดิม
  const history = conversationManager.getHistory(userId);

  // สร้าง contents ในรูปแบบ Gemini API
  const contents = [];

  // เพิ่มประวัติเดิม
  for (const item of history) {
    contents.push({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }]
    });
  }

  // เพิ่มข้อความล่าสุดของลูกค้า
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errText);
      return 'ขออภัยค่ะ ขณะนี้ระบบกำลังมีปัญหาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง หรือรอแอดมินเข้ามาดูแลนะคะ';
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      return 'ขออภัยค่ะ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้';
    }

    // บันทึกลงประวัติการสนทนา
    conversationManager.addMessage(userId, 'user', userMessage);
    conversationManager.addMessage(userId, 'model', replyText);

    return replyText.trim();
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว เจ้าหน้าที่จะรีบเข้ามาตอบนะคะ';
  }
}
