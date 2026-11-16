// scripts/setIcebreakers.js
// ตั้งค่าปุ่มคำถามเริ่มต้น (Icebreakers) บน Messenger เป็นภาษาลาว 100%

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const token = process.argv[2] || process.env.PAGE_ACCESS_TOKEN;

if (!token) {
  console.error('❌ กรุณาระบุ Token เช่น: node scripts/setIcebreakers.js <PAGE_ACCESS_TOKEN>');
  process.exit(1);
}

async function setIcebreakers() {
  const url = `https://graph.facebook.com/v21.0/me/messenger_profile?access_token=${token}`;
  
  const payload = {
    ice_breakers: [
      {
        question: "ຄີມລາຄາເທົ່າໃດ? (ໂປຣໂມຊັ່ນ)",
        payload: "ຄີມລາຄາເທົ່າໃດ? ມີໂປຣຫຍັງແດ່"
      },
      {
        question: "ຢາກເຫັນຣີວິວຈາກລູກຄ້າຕົວຈິງ",
        payload: "ຢາກເຫັນຣີວິວຈາກລູກຄ້າຕົວຈິງ"
      },
      {
        question: "1 ກ່ອງ ໃຊ້ໄດ້ຈັກມື້? / ວິທີໃຊ້",
        payload: "1 ກ່ອງໃຊ້ໄດ້ຈັກມື້ ແລະ ມີວິທີໃຊ້ແນວໃດ"
      },
      {
        question: "ມີເກັບເງິນປາຍທາງ (COD) ບໍ່?",
        payload: "ມີເກັບເງິນປາຍທາງ COD ບໍ່ ສົ່ງແນວໃດ"
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Result:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setIcebreakers();
