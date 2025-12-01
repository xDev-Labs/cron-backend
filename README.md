# Cron Backend API

A NestJS backend service for managing users and transactions with Supabase integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun.
- Supabase account and project.

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd cron-backend
bun install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=3000
NODE_ENV=development
```

3. **Set up database:**
   - Copy the SQL from `database/schema.sql`
   - Run it in your Supabase SQL Editor

4. **Start the server:**

```bash
bun run start:dev
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Response Format

All responses follow this structure:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array
}
```

---

## 👤 User Endpoints

### Create User

```http
POST /user/create
```

**Request Body:**

```json
{
  "phoneNumber": "+1234567890",
  "idToken": "<firebase_id_token>"
}
```

**Response:**

```json
{
  "status": true,
  "message": "User created successfully",
  "data": {
    "user":{
      "user_id": "user-uuid",
      "phone_number": "+1234567890",
      "cron_id": "unique_username",
      "primary_address": "0xabc123...",
      "wallet_address": ["0xabc123...", "0xdef456..."],
      "avatar_url": "https://example.com/avatar.png",
      "preferred_currency": "USD",
      "local_currency": "EUR",
      "face_id_enabled": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "isNewUser": true,
    "token":{
      "access_token": "jwt-access-token",
      "refresh_token":"jwt-refresh-token",
      "refreshTokenId":"refresh-token-uuid",
      "expiresIn":{
        "accessToken": "15m",
        "refreshToken": "7d"
      }
    }
}
```

### Register Cron ID

```http
POST /user/register-cron-id
```

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "cron_id": "new_unique_username"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cron ID registered successfully",
  "user": {
    "user_id": "user-uuid",
    "phone_number": "+1234567890",
    "cron_id": "unique_username",
    "primary_address": "0xabc123...",
    "wallet_address": ["0xabc123...", "0xdef456..."],
    "avatar_url": "https://example.com/avatar.png",
    "preferred_currency": "USD",
    "local_currency": "EUR",
    "face_id_enabled": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### AirDrop Tokens

```http
POST /user/airdrop
```

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "amount": 100
}
```

**Response:**

```json
{
  "success": true,
  "message": "Airdrop successful",
  "data": {
    "signature": "<tx_hash>",
    "userId": "user-uuid",
    "amount": 100
  }
}
```

### User onboard

```http
POST /user/onboard
```

**Request Header:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "walletAddress": "0xabc123...",
  "smartWalletAddress": "0xdef456...",
  "encodedTransaction": "<encoded_tx_data>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User onboarded successfully",
  "data": {
    "user": {
      // User object
    },
    "signature": "<tx_hash>"
  }
}
```

---

## 🗄️ Database Schema

### Users Table

| Field                | Type         | Description               |
| -------------------- | ------------ | ------------------------- |
| `user_id`            | UUID         | Primary key               |
| `phone_number`       | VARCHAR(20)  | Unique phone number       |
| `cron_id`            | VARCHAR(255) | Unique username           |
| `primary_address`    | VARCHAR(255) | Unique address            |
| `wallet_address`     | TEXT[]       | Array of wallet addresses |
| `avatar_url`         | TEXT         | Optional avatar URL       |
| `preferred_currency` | VARCHAR(3)   | Default: 'USD'            |
| `local_currency`     | VARCHAR(3)   | Default: 'USD'            |
| `face_id_enabled`    | BOOLEAN      | Default: false            |
| `created_at`         | TIMESTAMP    | Auto-generated            |
| `updated_at`         | TIMESTAMP    | Auto-updated              |

### Transactions Table

| Field              | Type          | Description                            |
| ------------------ | ------------- | -------------------------------------- |
| `transaction_hash` | TEXT          | Primary key                            |
| `sender_uid`       | UUID          | Foreign key to users                   |
| `receiver_uid`     | UUID          | Foreign key to users                   |
| `amount`           | DECIMAL(20,8) | Transaction amount                     |
| `token`            | tx_token[]    | Array of token objects                 |
| `chain_id`         | INTEGER       | Blockchain chain ID                    |
| `status`           | tx_status     | ENUM: 'pending', 'completed', 'failed' |
| `created_at`       | TIMESTAMP     | Auto-generated                         |
| `completed_at`     | TIMESTAMP     | Optional completion time               |

### Custom Types

```sql
-- Token type
CREATE TYPE tx_token AS (
  amount NUMERIC(20,8),
  token_address TEXT
);

-- Status enum
CREATE TYPE tx_status AS ENUM ('pending', 'completed', 'failed');
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
bun run start:dev

# Production build
bun run build
bun run start:prod

# Testing
bun run test
bun run test:e2e

# Linting
bun run lint
```

### Project Structure

```
src/
├── entities/          # TypeScript interfaces
├── routes/
│   ├── user/          # User-related endpoints
│   └── transaction/   # Transaction-related endpoints
├── supabase/          # Supabase configuration
├── app.module.ts      # Main application module
└── main.ts            # Application entry point

database/
└── schema.sql         # Database schema
```
