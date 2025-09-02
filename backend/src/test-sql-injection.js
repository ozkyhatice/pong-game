import { containsSqlInjection } from '../utils/validation.js';

// Test için örnek:
const testCases = [
  { input: 'normaluser', expected: false },
  { input: 'admin\'; DROP TABLE users; --', expected: true },
  { input: 'union select * from users', expected: true },
  { input: 'test@example.com', expected: false },
  { input: 'admin\'; SELECT * FROM users; --@example.com', expected: true }
];

testCases.forEach(test => {
  const result = containsSqlInjection(test.input);
  console.log(`Input: "${test.input}" - Expected: ${test.expected}, Actual: ${result}, Test ${result === test.expected ? 'PASSED' : 'FAILED'}`);
});
