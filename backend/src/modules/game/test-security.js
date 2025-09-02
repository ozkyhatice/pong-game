/**
 * Test file for SQL injection and XSS security in the game module
 */
import { validateGameInput, sanitizeGameInput, isValidUserId } from './utils/security.utils.js';

// Examples of malicious inputs and how they are handled
const maliciousInputs = [
  {
    // SQL injection attempt in roomId
    roomId: "1; DROP TABLE users;--",
    label: "SQL injection in roomId"
  },
  {
    // XSS attempt in message
    message: "<script>alert('XSS Attack')</script>",
    label: "XSS attack in message"
  },
  {
    // Invalid userId format
    userId: "1' OR '1'='1",
    label: "SQL injection in userId" 
  },
  {
    // Malicious coordinates
    y: "eval(alert(1))",
    label: "JS injection in coordinates"
  }
];

// Test the validation function
console.log("--- Testing validateGameInput ---");
maliciousInputs.forEach(input => {
  const result = validateGameInput(input);
  console.log(`Test: ${input.label}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log(`Result: ${JSON.stringify(result)}`);
  console.log("---");
});

// Test the sanitization function
console.log("--- Testing sanitizeGameInput ---");
maliciousInputs.forEach(input => {
  const sanitized = sanitizeGameInput(input);
  console.log(`Test: ${input.label}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log(`Sanitized: ${JSON.stringify(sanitized)}`);
  console.log("---");
});

// Test the userId validation
console.log("--- Testing isValidUserId ---");
const userIds = [
  { id: "123", label: "Valid numeric ID" },
  { id: "123; DROP TABLE users;--", label: "SQL injection attempt" },
  { id: "ABC", label: "Non-numeric ID" },
  { id: "1' OR 1=1", label: "SQL injection with quotes" }
];

userIds.forEach(test => {
  const result = isValidUserId(test.id);
  console.log(`Test: ${test.label}`);
  console.log(`Input: ${test.id}`);
  console.log(`Is Valid: ${result}`);
  console.log("---");
});

// Run this file with: node src/modules/game/test-security.js
