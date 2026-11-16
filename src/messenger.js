// src/messenger.js
// ระบบส่งข้อความและ Action กลับไปยัง Facebook Messenger API

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0/me/messages';

// ฟังก์ชันแบ่งข้อความหากยาวเกิน 2,000 ตัวอักษร (ขีดจำกัดของ Facebook Messenger)
function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    // พยายามตัดที่บรรทัดใหม่หรือเว้นวรรค
    let cutIndex = remaining.lastIndexOf('\n', maxLength);
    if (cutIndex === -1 || cutIndex < maxLength / 2) {
      cutIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (cutIndex === -1 || cutIndex < maxLength / 2) {
      cutIndex = maxLength;
    }

    chunks.push(remaining.substring(0, cutIndex).trim());
    remaining = remaining.substring(cutIndex).trim();
  }

  return chunks;
}

// ส่งสถานะกำลังพิมพ์ หรืออ่านแล้ว (mark_seen, typing_on, typing_off)
export async function sendSenderAction(recipientId, action) {
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
  if (!pageAccessToken || pageAccessToken.includes('your_facebook')) return;

  try {
    await fetch(`${GRAPH_API_URL}?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: action
      })
    });
  } catch (error) {
    console.error('Error sending sender action:', error.message);
  }
}

// ส่งข้อความตัวอักษรหาผู้ใช้
export async function sendTextMessage(recipientId, messageText) {
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
  if (!pageAccessToken || pageAccessToken.includes('your_facebook')) {
    console.warn('⚠️ ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN ในไฟล์ .env');
    return false;
  }

  const chunks = splitMessage(messageText);

  for (const chunk of chunks) {
    try {
      const response = await fetch(`${GRAPH_API_URL}?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: chunk }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Facebook Send API Error:', data);
        return false;
      }
    } catch (error) {
      console.error('Error sending Facebook message:', error.message);
      return false;
    }
  }

  return true;
}

// ส่งรูปภาพโดยใช้ Attachment ID ที่อัปโหลดไว้บน Facebook โดยตรง (รวดเร็วและแน่นอน 100%)
export async function sendAttachmentMessage(recipientId, attachmentId) {
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
  if (!pageAccessToken || pageAccessToken.includes('your_facebook')) {
    console.warn('⚠️ ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN');
    return false;
  }

  try {
    const response = await fetch(`${GRAPH_API_URL}?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              attachment_id: attachmentId
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Facebook Send Attachment API Error:', data);
      return false;
    }
    console.log(`✅ ส่งรูปภาพสำเร็จ (Attachment ID: ${attachmentId})`);
    return true;
  } catch (error) {
    console.error('Error sending Facebook attachment:', error.message);
    return false;
  }
}

// ส่งข้อความรูปภาพหาผู้ใช้ (ผ่าน URL)
export async function sendImageMessage(recipientId, imageUrl) {
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
  if (!pageAccessToken || pageAccessToken.includes('your_facebook')) {
    console.warn('⚠️ ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN');
    return false;
  }

  try {
    const response = await fetch(`${GRAPH_API_URL}?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Facebook Send Image API Error:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending Facebook image:', error.message);
    return false;
  }
}
