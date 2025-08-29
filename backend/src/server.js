import app from './app.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// İlk turnuvayı oluştur
async function createInitialTournament() {
  try {
    const { initDB } = await import('./config/db.js');
    const db = await initDB();
    
    // Pending durumda turnuva var mı kontrol et
    const existingTournament = await db.get(
      'SELECT * FROM tournaments WHERE status = "pending" LIMIT 1'
    );
    
    if (!existingTournament) {
      // İlk turnuvayı oluştur
      await db.run(
        'INSERT INTO tournaments (name, maxPlayers, status) VALUES (?, 4, "pending")',
        [`Initial Tournament ${Date.now()}`]
      );
      console.log('🏆 Initial tournament created');
    } else {
      console.log('🏆 Existing tournament found:', existingTournament.id);
    }
  } catch (error) {
    console.error('Error creating initial tournament:', error);
  }
}

app.listen({ port: PORT, host: HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
  
  // İlk turnuvayı oluştur
  await createInitialTournament();
});
