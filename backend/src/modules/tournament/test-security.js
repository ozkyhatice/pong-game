/**
 * Test file for SQL injection and XSS security in the tournament module
 */
import { validateTournamentInput, sanitizeTournamentInput, isValidUserId, sanitizeTournamentMessage } from './utils/security.utils.js';

// Examples of malicious inputs and how they are handled
const maliciousInputs = [
  {
    // SQL injection attempt in name
    name: "Tournament 1'; DROP TABLE users;--",
    maxPlayers: 4,
    label: "SQL injection in tournament name"
  },
  {
    // XSS attempt in name
    name: "<script>alert('XSS Attack')</script> Tournament",
    maxPlayers: 4,
    label: "XSS attack in tournament name"
  },
  {
    // Invalid tournamentId format
    tournamentId: "1' OR '1'='1",
    label: "SQL injection in tournamentId" 
  },
  {
    // Malicious maxPlayers
    maxPlayers: "5; DROP TABLE tournaments;--",
    label: "SQL injection in maxPlayers"
  }
];

// Test the validation function
console.log("--- Testing validateTournamentInput ---");
maliciousInputs.forEach(input => {
  const result = validateTournamentInput(input);
  console.log(`Test: ${input.label}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log(`Result: ${JSON.stringify(result)}`);
  console.log("---");
});

// Test the sanitization function
console.log("--- Testing sanitizeTournamentInput ---");
maliciousInputs.forEach(input => {
  const sanitized = sanitizeTournamentInput(input);
  console.log(`Test: ${input.label}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log(`Sanitized: ${JSON.stringify(sanitized)}`);
  console.log("---");
});

// Test the userId validation
console.log("--- Testing isValidUserId ---");
const userIds = [
  { id: "123", label: "Valid numeric ID" },
  { id: "123; DROP TABLE tournaments;--", label: "SQL injection attempt" },
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

// Test message sanitization
console.log("--- Testing sanitizeTournamentMessage ---");
const messages = [
  {
    type: "tournament",
    event: "created",
    data: {
      name: "<script>alert('XSS')</script> Tournament",
      tournamentId: 1,
      maxPlayers: 4
    },
    label: "XSS in tournament name"
  },
  {
    type: "tournament",
    event: "playerJoined",
    data: {
      userId: "1; DROP TABLE users;--",
      tournamentId: 1,
      message: "<img src='x' onerror='alert(1)'>"
    },
    label: "XSS in message and SQL injection in userId"
  }
];

messages.forEach(msg => {
  const sanitized = sanitizeTournamentMessage(msg);
  console.log(`Test: ${msg.label}`);
  console.log(`Input: ${JSON.stringify(msg)}`);
  console.log(`Sanitized: ${JSON.stringify(sanitized)}`);
  console.log("---");
});

// Run this file with: node src/modules/tournament/test-security.js
