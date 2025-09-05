
import { WebSocket } from 'ws';

export const clients = new Map();

export async function addClient(userId, connection) {
  clients.set(userId, connection);
}

export async function removeClient(userId) {
  clients.delete(userId);
}

export async function isConnected(userId) {
  return clients.has(userId) && clients.get(userId).readyState === WebSocket.OPEN;
}

export async function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((connection, userId) => {
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(messageStr);
    }
  });
}

export async function getCurrentTournamentId(userId) {
  const { initDB } = await import('../../config/db.js');
  const db = await initDB();
  const user = await db.get('SELECT currentTournamentId FROM users WHERE id = ?', [userId]);
  return user ? user.currentTournamentId : null;
}

export async function broadcastUserStatus(userId, status) {
  await broadcastToAll({
    type: 'userStatus',
    userID: userId,
    status: status
  });
}

export async function sendToUser(userId, messageData) {
  const socket = clients.get(userId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = JSON.stringify(messageData);
    socket.send(message);
  }
}

export async function getOnlineClientIds() {
  const onlineClients = [];
  clients.forEach((connection, userId) => {
    if (connection && connection.readyState === WebSocket.OPEN) {
      onlineClients.push(userId);
    }
  });
  return onlineClients;
}

export async function getClientCount() {
  let count = 0;
  clients.forEach((connection, userId) => {
    if (connection && connection.readyState === WebSocket.OPEN) {
      count++;
    }
  });
  return count;
}

export function getClientById(userId) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    return client;
  }
  return null;
}
