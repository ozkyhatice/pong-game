import { addClient, removeClient, broadcastUserStatus } from '../services/client.service.js';
import { undeliveredMessageController, onlineClientsController } from '../../modules/chat/controller/chat.controller.js';
import { metrics } from '../../plugins/metrics.js';

export async function handleConnection(connection, request) {
  console.log('\nWebSocket connection request received');

  // Prometheus active connections metric degerini arttir
  try {
    metrics.activeConnections.inc();
    console.log('Active connections metric incremented');
  } catch (err) {
    console.log('ERROR incrementing metrics:', err.message);
  }
  
  const token = request.headers['sec-websocket-protocol'];
  
  if (!token) {
    console.log('No token provided, closing connection');
    return connection.close();
  }
  
  try {
    const user = request.server.jwt.verify(token);
    const userId = user.id;
    console.log(`User ID from token: ${userId}`);
    
    // Add client to global map
    await addClient(userId, connection);
    
    // Broadcast user online status
    await broadcastUserStatus(userId, 'online');
    
    // Send undelivered messages
    await undeliveredMessageController(userId, connection);
    
    // Send online clients
    await onlineClientsController(connection);

    return userId;
  } catch (err) {
    console.error('WebSocket authentication failed:', err);
    throw err;
  }
}

export async function handleDisconnect(userId) {
  if (userId) {
    await removeClient(userId);
    await broadcastUserStatus(userId, 'offline');
    console.log(`Client ${userId} disconnected`);
  }
  
  // Update active connections metric regardless of userId
  try {
    metrics.activeConnections.dec();
    console.log('Active connections metric decremented');
  } catch (err) {
    console.log('ERROR decrementing metrics:', err.message);
  }
}
