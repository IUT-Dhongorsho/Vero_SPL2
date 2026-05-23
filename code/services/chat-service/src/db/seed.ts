import { db } from './client.js';
import { channels, channelMembers } from '../models/channel.model.js';
import { users } from '../models/user.model.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Create a system user
    const [systemUser] = await db.insert(users).values({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'System Bot',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=system',
    }).onConflictDoNothing().returning();

    const userId = systemUser?.id || '00000000-0000-0000-0000-000000000000';

    // 2. Create a global announcements channel
    const [announcements] = await db.insert(channels).values({
      name: 'Global Announcements',
      type: 'public',
    }).returning();

    // 3. Add system bot to announcements
    await db.insert(channelMembers).values({
      channelId: announcements.id,
      userId: userId,
      role: 'admin',
    });

    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
