import app from './app.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';


async function createInitialTournament() {
  try {
    const { initDB } = await import('./config/db.js');
    const db = await initDB();
    
    
    const existingTournament = await db.get(
      'SELECT * FROM tournaments WHERE status = "pending" LIMIT 1'
    );
    
    if (!existingTournament) {
      
      await db.run(
        'INSERT INTO tournaments (name, maxPlayers, status) VALUES (?, 4, "pending")',
        [`Initial Tournament ${Date.now()}`]
      );
    }
  } catch (error) {}
}

app.listen({ port: PORT, host: HOST }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  
  
  await createInitialTournament();
});
