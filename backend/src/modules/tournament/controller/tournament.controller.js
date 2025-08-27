import { createTournamentService } from '../service/tournament.service.js';
export async function handleTournamentMessage(msgObj, userId, connection) {
  const { event, data} = msgObj;
  const handler = eventHandlers[event];
  if (!handler) {
    throw new Error(`Unknown tournament event: ${event}`);
  }
  return await handler(data, userId, connection);
}

const eventHandlers = {
    'create': createTournament,
}

export async function createTournament(data, userId, connection) {
    await createTournamentService(data, userId);

}