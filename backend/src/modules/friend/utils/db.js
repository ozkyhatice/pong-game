
import { initDB } from '../../../config/db.js';
import { containsSqlInjection } from '../../../utils/validation.js';

// params: query - SQL query string with placeholders (?)
// params: params - Array of parameters to bind to the query placeholders
// returns: result of the query (array of rows for SELECT, run result for INSERT/UPDATE/DELETE)
export async function executeSecureQuery(query, params = []) {
  // Check for SQL injection in the query itself (extra precaution)
  if (containsSqlInjection(query)) {
    throw new Error('Security violation: Potential SQL injection detected in query');
  }
  
  // Check each parameter for SQL injection patterns
  const hasInjection = params.some(param => {
    if (typeof param === 'string') {
      return containsSqlInjection(param);
    }
    return false;
  });
  
  if (hasInjection) {
    throw new Error('Security violation: Potential SQL injection detected in parameters');
  }
  
  // Get database connection
  const db = await initDB();
  
  // Determine query type and execute accordingly
  if (query.trim().toLowerCase().startsWith('select') || query.includes('where')) {
    // For SELECT queries or any query with a WHERE clause
    if (query.includes('*')) {
      // Consider refining broad select statements to specific columns when possible
      console.log('Warning: Using SELECT * might expose sensitive data');
    }
    
    if (query.toLowerCase().includes('limit') && !params.some(p => typeof p === 'number')) {
      // Make sure LIMIT parameters are numbers
      console.log('Warning: LIMIT clause should use numeric parameters');
    }
    
    return db.all(query, params);
  } else if (query.trim().toLowerCase().startsWith('insert')) {
    return db.run(query, params);
  } else if (query.trim().toLowerCase().startsWith('update') || query.trim().toLowerCase().startsWith('delete')) {
    return db.run(query, params);
  } else {
    // For other types of queries
    return db.run(query, params);
  }
}
