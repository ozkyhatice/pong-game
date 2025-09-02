# Friend Module Security Documentation

## Overview
This document outlines the security measures implemented in the Friend module to prevent common web vulnerabilities, particularly XSS (Cross-Site Scripting) and SQL Injection attacks.

## Implemented Security Measures

### 1. Input Validation & Sanitization

#### User ID Validation
- All user IDs are validated to ensure they are positive integers
- Custom validation function: `validateUserId()` in `/modules/friend/utils/validation.js`
- Rejects non-numeric values, negative numbers, and zero

#### Parameter Sanitization
- All user-provided inputs are sanitized before processing
- String values are escaped to prevent XSS attacks
- Custom sanitization function: `sanitizeFriendData()` in `/modules/friend/utils/validation.js`

### 2. SQL Injection Prevention

#### Parameterized Queries
- All database queries use parameterized statements
- User inputs are never directly interpolated into SQL queries
- Extra validation layer with `containsSqlInjection()` to detect SQL injection patterns

#### Secure Database Wrapper
- Custom wrapper: `executeSecureQuery()` in `/modules/friend/utils/db.js`
- Additional validation layer for all database interactions
- Checks both the query and parameters for SQL injection patterns

### 3. XSS Prevention

#### HTML Escaping
- All user-generated content is escaped before returning in responses
- Uses `escapeHTML()` function from `/utils/security.js`
- Converts special characters to their HTML entities:
  - `&` → `&amp;`
  - `<` → `&lt;`
  - `>` → `&gt;`
  - `"` → `&quot;`
  - `'` → `&#39;`

#### Response Sanitization
- User data in responses (usernames, avatars, etc.) is sanitized before sending
- Prevents stored XSS attacks in user profile data

### 4. HTTP Security Headers

#### Added Security Headers
- `X-XSS-Protection: 1; mode=block` - Browser's XSS protection
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `Content-Security-Policy` - Restricts resource loading
- `Referrer-Policy` - Controls HTTP referrer information
- `Permissions-Policy` - Restricts browser features

#### Implementation
- Added via middleware: `addSecurityHeaders()` in `/modules/friend/middleware/security.js`
- Applied to all friend module routes

### 5. Schema Validation

#### Request Validation
- Uses Fastify's schema validation
- Enforces data types and required fields
- Added minimum value constraints for numeric fields
- Defined in `/modules/friend/schema.js`

#### Response Validation
- Structured response schemas defined for all endpoints
- Prevents accidental data leakage

## Best Practices

1. **Defense in Depth**: Multiple layers of protection at different levels
2. **Validation at Entry Points**: All user inputs are validated as early as possible
3. **Parameterized Queries**: No direct string concatenation in SQL queries
4. **Output Encoding**: All user data is properly escaped before output
5. **HTTP Security Headers**: Browser-level protections enabled

## Testing Security Measures

To test the security measures:

1. **SQL Injection Testing**:
   - Try sending SQL fragments in user IDs: `1 OR 1=1`
   - Test quote escaping: `1'; DROP TABLE users;--`

2. **XSS Testing**:
   - Try sending script tags in profile data: `<script>alert('XSS')</script>`
   - Test HTML injection: `<img src="x" onerror="alert('XSS')">`

3. **Parameter Validation**:
   - Try sending negative user IDs: `-1`
   - Try sending non-numeric user IDs: `abc`

## Maintenance and Updates

- Regularly review security measures
- Keep dependencies updated
- Follow security best practices
- Consider periodic security audits
