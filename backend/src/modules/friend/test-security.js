/**
 * Test file for friend module security features
 * Tests the validation and sanitization functionality for the friend module
 */
import { validateUserId, sanitizeFriendData } from './utils/validation.js';

// Test validation of user IDs
console.log('=== Testing User ID Validation ===');

// Valid user ID
const validTest = validateUserId(123);
console.log('Valid User ID:', validTest);
if (!validTest.isValid || validTest.sanitizedValue !== 123) {
  console.error('❌ Failed to validate valid user ID');
} else {
  console.log('✅ Successfully validated valid user ID');
}

// Invalid user ID format (not a number or string)
const invalidFormatTest = validateUserId({id: 123});
console.log('Invalid Format User ID:', invalidFormatTest);
if (invalidFormatTest.isValid) {
  console.error('❌ Failed to reject invalid user ID format');
} else {
  console.log('✅ Successfully rejected invalid user ID format');
}

// SQL Injection attempt
const sqlInjectionTest = validateUserId("1; DROP TABLE users;");
console.log('SQL Injection User ID:', sqlInjectionTest);
if (sqlInjectionTest.isValid) {
  console.error('❌ Failed to reject SQL injection attempt');
} else {
  console.log('✅ Successfully rejected SQL injection attempt');
}

// Test sanitization of friend data
console.log('\n=== Testing Friend Data Sanitization ===');

const testFriendData = {
  message: 'Hello <script>alert("XSS")</script>',
  status: 'pending',
  userId: 123
};

const sanitizedData = sanitizeFriendData(testFriendData);
console.log('Original data:', testFriendData);
console.log('Sanitized data:', sanitizedData);

// Check if XSS was sanitized
if (sanitizedData.message.includes('<script>')) {
  console.error('❌ Failed to sanitize XSS in friend data');
} else {
  console.log('✅ Successfully sanitized XSS in friend data');
}

console.log('\n=== All Tests Completed ===');
