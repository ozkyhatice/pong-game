
import { initDB } from '../../../config/db.js';
import { containsSqlInjection } from '../../../utils/validation.js';




export async function executeSecureQuery(query, params = []) {
  
  if (containsSqlInjection(query)) {
    throw new Error('Security violation: Potential SQL injection detected in query');
  }
  
  
  const hasInjection = params.some(param => {
    if (typeof param === 'string') {
      return containsSqlInjection(param);
    }
    return false;
  });
  
  if (hasInjection) {
    throw new Error('Security violation: Potential SQL injection detected in parameters');
  }
  
  
  const db = await initDB();
  
  
  if (query.trim().toLowerCase().startsWith('select') || query.includes('where')) {
    
    if (query.includes('*')) {
      
    }
    
    if (query.toLowerCase().includes('limit') && !params.some(p => typeof p === 'number')) {
      
    }
    
    return db.all(query, params);
  } else if (query.trim().toLowerCase().startsWith('insert')) {
    return db.run(query, params);
  } else if (query.trim().toLowerCase().startsWith('update') || query.trim().toLowerCase().startsWith('delete')) {
    return db.run(query, params);
  } else {
    
    return db.run(query, params);
  }
}
