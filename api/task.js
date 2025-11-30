import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // "data" parametresi: Cüzdan adresi veya kullanıcı adı buraya gelecek
  const { email, taskID, data } = req.body;
  
  const REWARDS = { 
    'twitter': 200, 
    'telegram': 200,
    'wallet': 100 // Yeni görev puanı
  };

  try {
    const user = await kv.hget('users', email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Görev daha önce yapıldı mı kontrolü
    if (user.tasks && user.tasks[taskID]) {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Puanı Ekle
    const reward = REWARDS[taskID] || 0;
    user.xp += reward;
    
    // Görevi işaretle
    user.tasks = { ...user.tasks, [taskID]: true };

    // EKSTRA VERİLERİ KAYDET (Cüzdan, Kullanıcı Adları)
    if (taskID === 'wallet') user.walletAddress = data;
    if (taskID === 'twitter') user.twitterHandle = data;
    if (taskID === 'telegram') user.telegramHandle = data;

    // Veritabanını Güncelle
    await kv.hset('users', { [email]: user });
    
    // Leaderboard'u Güncelle (Yeni puanla)
    await kv.zadd('leaderboard', { score: user.xp, member: email });

    return res.status(200).json({ success: true, newXP: user.xp });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error updating task' });
  }
}
