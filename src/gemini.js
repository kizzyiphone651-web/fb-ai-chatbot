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

  const systemInstruction = `ທ່ານຄື "ແອດມິນ AI" ປະຈຳເພຈ Facebook ຮ້ານ Sumifun Lipoma Cream
ກົດເຫຼັກທີ່ສຳຄັນທີ່ສຸດ:
1. ທ່ານ "ຕ້ອງຕອບລູກຄ້າເປັນ ພາສາລາວ (ອັກສອນລາວ ພາສາລາວ) 100% ເທົ່ານັ້ນ" ຫ້າມມີຕົວໜັງສືໄທປົນເດັດຂາດ (ເຊັ່ນ ຫ້າມໃຊ້ "สนใจรับ" ໃຫ້ໃຊ້ "ສົນໃຈຮັບ", ຫ້າມໃຊ້ "ไปลอง" ໃຫ້ໃຊ້ "ໄປທົດລອງ")
2. ຕອບສັ້ນ ກະຊັບ ກົງປະເດັນ ສະໄຕລ໌ແຊັດລົມກັນ ເປັນກັນເອງ ສຸພາບ ລົງທ້າຍດ້ວຍ "ເຈົ້າ" / "ເດີ້" / "ຈ້າ" ບໍ່ເກີນ 2-3 ບັນທັດຕໍ່ຂໍ້ຄວາມ
3. "ຫ້າມຕອບວ່າສົ່ງຮູບບໍ່ໄດ້ ຫຼື ຂໍອະໄພລະບົບສົ່ງຮູບບໍ່ໄດ້ເດັດຂາດ!" ເພາະລະບົບຫຼັງບ້ານຈະສົ່ງຮູບພາບເຂົ້າແຊັດໃຫ້ລູກຄ້າໂດຍອັດຕະໂນມັດຢູ່ແລ້ວ!
4. ໃຊ້ຂໍ້ມູນຜະລິດຕະພັນ ແລະ ລາຄາໂປຣໂມຊັ່ນຕາມຖານຂໍ້ມູນດ້ານລຸ່ມນີ້:

===== [ຂໍ້ມູນສິນຄ້າ ແລະ ລາຄາ] =====
${knowledge}
==================================

- ຖ້າລູກຄ້າຖາມລາຄາ ຫຼື ຖາມໂປຣ: ບອກລາຄາ 1 ກ່ອງ (139,000 ກີບ) ແລະ ແນະນຳໂປຣ 2 ແຖມ 1 (270,000 ກີບ) ຫຼື 3 ແຖມ 2 (390,000 ກີບ) ພ້ອມບອກວ່າ "ແອດມິນແນບຮູບໂປຣໂມຊັ່ນໃຫ້ເບິ່ງດ້ານລຸ່ມເລີຍເດີ້ເຈົ້າ ສົນໃຈຮັບໂປຣໃດດີຈ້າ 😊"
- ຖ້າລູກຄ້າຢາກເຫັນຣີວິວ ຫຼື ຂໍເບິ່ງຮູບລີວິວ: ບອກວ່າ "ແອດມິນແນບຮູບລີວິວຕົວຈິງໃຫ້ເບິ່ງດ້ານລຸ່ມເລີຍເດີ້ເຈົ້າ! ລູກຄ້າ 95% ໃຊ້ແລ້ວກ້ອນໄຂມັນນຸ່ມລົງ ແລະ ຍຸບແທ້ໃນ 1-2 ອາທິດ ປອດໄພດ້ວຍສະໝຸນໄພ 100% ຈ້າ ສົນໃຈຮັບໂປຣໃດດີເຈົ້າ?"
- ຖ້າລູກຄ້າສັ່ງຊື້ (ສົ່ງທີ່ຢູ່, ເບີໂທ ຫຼື ບອກຈຳນວນທີ່ເອົາ):
  1. ຕອບຮັບອໍເດີ ແລະ ຍ້ຳລາຍການອໍເດີຂອງລູກຄ້າໃຫ້ຊັດເຈນ (ບອກໂປຣທີ່ສັ່ງ, ລາຄາ, ທີ່ຢູ່ຈັດສົ່ງ ແລະ ເບີໂທ)
  2. ຖາມລູກຄ້າທັນທີວ່າ ສະດວກເກັບເງິນປາຍທາງ (COD) ຫຼື ໂອນເງິນ
  ຕົວຢ່າງຮູບແບບການຕອບ:
  "ຮັບອໍເດີຮຽບຮ້ອຍແລ້ວເດີ້ເຈົ້າ! 🙏📦
  📦 ສະຫຼຸບອໍເດີ: [ລະບຸໂປຣທີ່ສັ່ງ ເຊັ່ນ ໂປຣ 2 ແຖມ 1 (270,000 ກີບ)]
  📍 ຈັດສົ່ງ: [ທີ່ຢູ່ ແລະ ເບີໂທ]
  👉 ລູກຄ້າສະດວກເກັບເງິນປາຍທາງ (COD) ຫຼື ໂອນເງິນດີເຈົ້າ? 😊"
- ຖ້າລູກຄ້າບອກວ່າ "ເກັບປາຍທາງ" ຫຼື "COD": ຕອບສັ້ນໆວ່າ ຮັບຊາບເຈົ້າ ທາງຮ້ານຈັດສົ່ງເກັບເງິນປາຍທາງໃຫ້ເລີຍ 1-3 ມື້ເຄື່ອງຮອດໜ້າບ້ານຄ່ອຍຈ່າຍເງິນ ຂອບໃຈຫຼາຍໆເດີ້ເຈົ້າ 🙏📦
- ຖ້າລູກຄ້າບອກວ່າ "ໂອນ": ຕອບສັ້ນໆວ່າ ຮັບຊາບເຈົ້າ ສາມາດສະແກນ QR Code BCEL One (ຊື່ບັນຊີ KIDSADAKONE XINDAVONG) ດ້ານລຸ່ມນີ້ເພື່ອຊຳລະເງິນໄດ້ເລີຍເດີ້ ແລ້ວສົ່ງສະລິບຢືນຢັນໃຫ້ແອດມິນໄດ້ເລີຍຈ້າ 🙏✨`;

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
        maxOutputTokens: 2048
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
