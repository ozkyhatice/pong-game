/**
 * Test file for SQL injection and XSS security in the user module
 */
import { validateUserInput, sanitizeUserInput, isValidUserId, sanitizeUserProfile } from './utils/security.utils.js';

// Examples of malicious inputs and how they are handled
const maliciousInputs = [
  {
    // SQL injection attempt in username
    username: "admin'; DROP TABLE users;--",
    email: "test@example.com",
    label: "SQL injection in username"
  },
  {
    // XSS attempt in username
    username: "<script>alert('XSS Attack')</script>",
    email: "test@example.com",
    label: "XSS attack in username"
  },
  {
    // SQL injection in email
    username: "validuser",
    email: "test@example.com'; DROP TABLE users;--",
    label: "SQL injection in email" 
  },
  {
    // Invalid input
    username: "us",  // Too short
    email: "invalid-email",
    label: "Invalid format input"
  }
];

// Test the validation function
console.log("--- Testing validateUserInput ---");
maliciousInputs.forEach(input => {
  const result = validateUserInput(input);
  console.log(`Test: ${input.label}`);
  console.log(`Input: ${JSON.stringify(input)}`);
  console.log(`Result: ${JSON.stringify(result)}`);
  console.log("---");
});

// Test the sanitization function
console.log("--- Testing sanitizeUserInput ---");
maliciousInputs.forEach(input => {
  const sanitized = sanitizeUserInput(input);
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

// Test profile sanitization
console.log("--- Testing sanitizeUserProfile ---");
const userProfiles = [
  {
    id: 1,
    username: "<script>alert('XSS')</script>",
    email: "user@example.com",
    avatar: "https://example.com/avatar.jpg?<script>alert('XSS')</script>",
    password: "secret123",
    twoFASecret: "ABCDEF123456",
    wins: 10,
    losses: 5,
    label: "User with XSS in username and avatar"
  },
  {
    id: 2,
    username: "normaluser",
    email: "<img src=x onerror=alert('XSS')>",
    avatar: "avatar.jpg",
    password: "secret456",
    wins: 0,
    losses: 0,
    label: "User with XSS in email"
  }
];

userProfiles.forEach(profile => {
  const sanitized = sanitizeUserProfile(profile);
  console.log(`Test: ${profile.label}`);
  console.log(`Original: ${JSON.stringify(profile)}`);
  console.log(`Sanitized: ${JSON.stringify(sanitized)}`);
  console.log(`Password removed: ${sanitized.password === undefined}`);
  console.log(`2FA Secret removed: ${sanitized.twoFASecret === undefined}`);
  console.log("---");
});

// Run this file with: node src/modules/user/test-security.js
