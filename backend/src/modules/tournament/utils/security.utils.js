import { escapeHTML, sanitizeInput } from '../../../utils/security.js';
import { containsSqlInjection } from '../../../utils/validation.js';

export function sanitizeTournamentInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  if (sanitized.name && typeof sanitized.name === 'string') {
    sanitized.name = sanitizeInput(sanitized.name);
  }
  if (sanitized.tournamentId && typeof sanitized.tournamentId === 'string') {
    sanitized.tournamentId = sanitizeInput(sanitized.tournamentId);
  }
  if (sanitized.message && typeof sanitized.message === 'string') {
    sanitized.message = sanitizeInput(sanitized.message);
  }
  if (sanitized.maxPlayers !== undefined) {
    sanitized.maxPlayers = Number(sanitized.maxPlayers);
  }
  
  return sanitized;
}

export function validateTournamentInput(data) {
  if (!data) {
    return { isValid: false, message: 'No data provided' };
  }
  
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && containsSqlInjection(value)) {
      return { 
        isValid: false, 
        message: `Suspicious input detected in ${key}` 
      };
    }
  }
  
  
  if (data.tournamentId && typeof data.tournamentId === 'string') {
    
    if (!/^\d+$/.test(data.tournamentId)) {
      return { 
        isValid: false, 
        message: 'Invalid tournament ID format' 
      };
    }
  }
  
  
  if (data.maxPlayers !== undefined) {
    const maxPlayers = Number(data.maxPlayers);
    if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
      return { 
        isValid: false, 
        message: 'Max players must be between 2 and 4' 
      };
    }
  }
  
  
  if (data.name !== undefined && typeof data.name === 'string') {
    if (data.name.trim().length < 3 || data.name.trim().length > 30) {
      return { 
        isValid: false, 
        message: 'Tournament name must be between 3 and 30 characters' 
      };
    }
  }
  
  return { isValid: true, message: 'Input is valid' };
}

export function isValidUserId(userId) {
  
  return !isNaN(parseInt(userId)) && parseInt(userId).toString() === userId.toString();
}

export function prepareSqlParams(params) {
  if (!Array.isArray(params)) {
    return [];
  }
  
  return params.map(param => {
    if (typeof param === 'string') {
      
      return param.replace(/['";]/g, '');
    }
    return param;
  });
}
export function sanitizeTournamentMessage(message) {
  if (!message || typeof message !== 'object') {
    return message;
  }
  
  const sanitized = { ...message };
  
  if (sanitized.data && typeof sanitized.data === 'object') {
    sanitized.data = sanitizeTournamentInput(sanitized.data);
  }
  
  return sanitized;
}
