import { v4 as uuidv4 } from 'uuid';
export async function generateRoomId() {
    return uuidv4();
}

export async function sendMessage(connection, type, event, data = {}) {
  if (connection.readyState === connection.OPEN) {
    connection.send(JSON.stringify({ type, event, data }));
  } else {
    console.warn('Tried to send message to closed connection.');
  }
}