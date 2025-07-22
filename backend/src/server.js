import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen({ port: PORT });
console.log(`🚀 Server running at http://localhost:${PORT}`);

app.get('/', async (request, reply) => {
  reply.send({ message: 'Welcome to the Pong Game API!' });
});
