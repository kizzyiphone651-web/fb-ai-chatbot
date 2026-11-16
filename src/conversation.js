// src/conversation.js
// ระบบจำประวัติการสนทนาของลูกค้าแต่ละคน (Memory Cache)

class ConversationManager {
  constructor(timeoutMs = 30 * 60 * 1000, maxHistory = 10) {
    this.sessions = new Map();
    this.timeoutMs = timeoutMs; // ค่าเริ่มต้น รีเซ็ตประวัติหากไม่คุยเกิน 30 นาที
    this.maxHistory = maxHistory; // เก็บประวัติย้อนหลังสูงสุด 10 ประโยคล่าสุด
  }

  getHistory(userId) {
    const session = this.sessions.get(userId);
    if (!session) return [];

    // ตรวจสอบว่าหมดอายุหรือยัง
    if (Date.now() - session.lastActivity > this.timeoutMs) {
      this.sessions.delete(userId);
      return [];
    }

    return session.history;
  }

  addMessage(userId, role, text) {
    let session = this.sessions.get(userId);
    if (!session || Date.now() - session.lastActivity > this.timeoutMs) {
      session = { history: [], lastActivity: Date.now() };
    }

    session.history.push({ role, text });

    // จำกัดจำนวนข้อความไม่ให้ยาวเกินไป
    if (session.history.length > this.maxHistory * 2) {
      session.history = session.history.slice(-this.maxHistory * 2);
    }

    session.lastActivity = Date.now();
    this.sessions.set(userId, session);
  }

  clearSession(userId) {
    this.sessions.delete(userId);
  }
}

export const conversationManager = new ConversationManager();
