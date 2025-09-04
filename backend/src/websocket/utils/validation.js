import { containsSqlInjection as mainContainsSqlInjection } from '../../utils/validation.js';

export function containsSqlInjection(input) {
  return mainContainsSqlInjection(input);
}


export function objectContainsSqlInjection(obj) {
  if (obj === null || obj === undefined) {
    return false;
  }
  
  if (typeof obj === 'string') {
    return containsSqlInjection(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.some(item => objectContainsSqlInjection(item));
  }
  
  if (typeof obj === 'object') {
    return Object.entries(obj).some(([key, value]) => {
      return (typeof key === 'string' && containsSqlInjection(key)) || 
             objectContainsSqlInjection(value);
    });
  }
  
  return false;
}
