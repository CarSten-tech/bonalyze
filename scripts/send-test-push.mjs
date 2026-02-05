import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
  console.log('Please add it to run this test script.');
  process.exit(1);
}

if (!vapidPrivateKey) {
    console.error('❌ Error: VAPID_PRIVATE_KEY is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidPublicKey,
  vapidPrivateKey
);

async function sendTest() {
  console.log('🔍 Fetching latest subscription...');
  
  // Fetch latest subscription regardless of user
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ DB Error:', error.message);
    return;
  }

  if (!subs || subs.length === 0) {
    console.error('⚠️ No subscriptions found! Did you enable notifications in the UI?');
    return;
  }

  const sub = subs[0];
  console.log(`📱 Found subscription for User ID: ${sub.user_id}`);
  console.log(`   User Agent: ${sub.user_agent || 'Unknown'}`);

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: sub.auth_keys
  };

  try {
    console.log('🚀 Sending notification...');
    const payload = JSON.stringify({
      title: 'Bonalyze Test',
      body: '🔔 Dies ist eine Test-Nachricht vom Server!',
      icon: '/icons/icon-192x192.png', // Adjust path if needed
      data: {
        url: '/dashboard'
      }
    });

    await webpush.sendNotification(pushSubscription, payload);
    console.log('✅ Success! Notification sent.');
  } catch (err) {
    console.error('❌ Failed to send notification:', err);
    if (err.statusCode === 410) {
        console.log('ℹ️ Subscription is no longer valid (user unsubscribed or expired). Deleting from DB...');
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
}

sendTest();
