import dotenv from 'dotenv';
dotenv.config();

const token = process.env.PAGE_ACCESS_TOKEN;

async function check() {
  const url = `https://graph.facebook.com/v21.0/me/conversations?fields=id,senders,messages.limit(10){message,from,created_time,attachments}&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  
  for (const c of (data.data || []).slice(0, 3)) {
    console.log('====================================');
    const customer = c.senders?.data?.find(s => s.id !== '1320277404483712');
    console.log(`Customer: ${customer?.name} (PSID: ${customer?.id})`);
    for (const m of (c.messages?.data || []).reverse()) {
      console.log(`  - [${m.from?.name} (${m.created_time})]: ${m.message || '[IMAGE/ATTACHMENT]'}`);
    }
  }
}

check();
