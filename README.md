# Pong Game

A modern multiplayer Pong game built with TypeScript and Fastify, featuring real-time gameplay, user authentication, and social features.

## Architecture

**Backend:** RESTful API with WebSocket support  
**Frontend:** Component-based TypeScript SPA  
**Database:** SQLite with schema-based modules  
**Deployment:** Docker containerization

```
├── backend/              # Fastify API server
│   ├── src/
│   │   ├── modules/      # Feature modules (auth, chat, game, etc.)
│   │   ├── websocket/    # Real-time communication
│   │   └── middleware/   # Authentication & security
├── frontend-v2/          # TypeScript client
│   ├── core/            # Router, components, utilities
│   ├── pages/           # SPA routes and components
│   └── styles/          # Tailwind CSS
└── docker-compose.yml   # Container orchestration
```

## Tech Stack

### Backend
- **Fastify** - High-performance web framework
- **SQLite** - Embedded database with custom schema
- **WebSocket** - Real-time game state synchronization
- **JWT** - Stateless authentication
- **Argon2** - Password hashing
- **Speakeasy/QR** - Two-factor authentication

### Frontend  
- **TypeScript** - Type-safe JavaScript
- **Custom Router** - Client-side routing without frameworks
- **Component Architecture** - Modular UI system
- **Tailwind CSS** - Utility-first styling
- **BabylonJS** - 3D graphics rendering

## Features

### Implemented
- **Authentication System** - Registration, login, JWT tokens
- **Two-Factor Authentication** - TOTP with QR code generation
- **User Management** - Profile, avatar upload, user search
- **Friend System** - Add/remove friends, friend lists
- **Real-time Chat** - WebSocket-based messaging
- **File Upload** - Avatar image handling with validation
- **OAuth Integration** - Google authentication flow

### In Development
- **Game Engine** - Real-time multiplayer Pong mechanics
- **Matchmaking** - Player pairing and game rooms
- **Tournament System** - Bracket-based competitions
- **Game Statistics** - Performance tracking and leaderboards

## Quick Start

### Development Environment
```bash
# Clone and setup
git clone https://github.com/cantasar/pong-game
cd pong-game

# Backend
cd backend
npm install
npm run dev        # http://localhost:3000

# Frontend  
cd ../frontend-v2
npm install
npm run dev        # http://localhost:8080
```

### Docker Deployment
```bash
docker-compose up --build
```
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:8080`

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Current user profile

### Two-Factor Authentication
- `POST /2fa/setup` - Generate TOTP secret and QR code
- `POST /2fa/verify` - Verify TOTP code
- `POST /2fa/disable` - Disable 2FA

### Social Features
- `GET /users/search` - Search users by username
- `POST /friends/add` - Send friend request
- `GET /friends` - List friends and requests
- `POST /chat/send` - Send chat message

### WebSocket Events
- `connection` - Client authentication and registration
- `chat_message` - Real-time messaging
- `game_*` - Game state synchronization (planned)

## Development Focus

Currently working on:
1. **Game Engine Integration** - Implementing real-time Pong physics
2. **WebSocket Game Protocol** - Standardizing game state messages  
3. **Matchmaking Logic** - Player pairing algorithms
4. **Performance Optimization** - Frame rate and latency improvements

## Database Schema

The application uses a modular schema approach where each feature module defines its own tables:
- `users` - User accounts and profiles
- `friends` - Friend relationships and requests  
- `chat_messages` - Message history
- `games` - Game sessions and results (planned)
- `tournaments` - Tournament brackets (planned)

## Security

- **Argon2** password hashing with salt
- **JWT** tokens with expiration
- **CORS** configuration for API access
- **Input validation** on all endpoints
- **File upload** restrictions and validation
- **2FA** support for enhanced security

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, coding standards, and pull request process.

