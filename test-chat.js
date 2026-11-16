// test-chat.js
// สคริปต์สำหรับทดสอบคุยกับ AI และข้อมูลร้านค้า (knowledge.md) ใน Terminal ได้ทันที โดยไม่ต้องต่อ Facebook

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import readline from 'readline';
import { getAiReply, loadKnowledge } from './src/gemini.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('====================================================');
console.log('🤖 ยินดีต้อนรับสู่ระบบทดสอบแชตบอท (Terminal Test Mode)');
console.log('💡 ระบบกำลังใช้ข้อมูลจากไฟล์: knowledge.md');
console.log('📌 พิมพ์ข้อความที่ต้องการทดสอบได้เลย หรือพิมพ์ "exit" เพื่อออก');
console.log('====================================================\n');

const testUserId = 'test-customer-001';

function askQuestion() {
  rl.question('👤 คุณลูกค้า: ', async (userInput) => {
    const trimmed = userInput.trim();
    if (!trimmed) {
      askQuestion();
      return;
    }

    if (trimmed.toLowerCase() === 'exit' || trimmed === 'ออก') {
      console.log('\n👋 จบการทดสอบ ขอบคุณครับ!');
      rl.close();
      process.exit(0);
    }

    console.log('⏳ กำลังคิดคำตอบ...');
    try {
      const reply = await getAiReply(testUserId, trimmed);
      console.log(`\n🤖 แอดมิน AI:\n${reply}\n`);
      console.log('----------------------------------------------------');
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err.message);
    }

    askQuestion();
  });
}

askQuestion();
