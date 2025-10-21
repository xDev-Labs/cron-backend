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

### Get User by ID

```http
GET /user/:id
```

**Response:**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user_id": "uuid",
    "phone_number": "+1234567890",
    "cron_id": "username",
    "primary_address": "123 Main St",
    "wallet_address": ["0x1234..."],
    "avatar_url": "https://...",
    "preferred_currency": "USD",
    "local_currency": "USD",
    "face_id_enabled": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:05:00Z"
  }
}
```

### Check Cron ID Availability

```http
GET /user/cron-id/check/:cronId
```

**Response:**

```json
{
  "success": true,
  "message": "Cron ID is available",
  "data": {
    "cronId": "username",
    "available": true
  }
}
```

**Possible messages:**

- `"Cron ID is available"` - Available to use
- `"Cron ID is already taken"` - Already in use
- `"Cron ID must be at least 3 characters long"` - Too short

### Register Cron ID

```http
POST /user/cron-id/register
```

**Request Body:**

```json
{
  "userId": "user-uuid",
  "cronId": "username"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cron ID registered successfully",
  "data": {
    // Updated user object
  }
}
```

---

## 💰 Transaction Endpoints

### Get Transaction by Hash

```http
GET /transaction/:hash
```

**Response:**

```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "transaction_hash": "0x1234567890abcdef",
    "sender_uid": "user-uuid-1",
    "receiver_uid": "user-uuid-2",
    "amount": 100.5,
    "token": [
      {
        "amount": "100.50",
        "token_address": "0x1234..."
      }
    ],
    "chain_id": 1,
    "status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:05:00Z"
  }
}
```

### Get User Transactions (with Pagination)

```http
GET /transaction/user/:userId?page=1&limit=10
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**

```json
{
  "success": true,
  "message": "User transactions retrieved successfully",
  "data": {
    "userId": "user-uuid",
    "transactions": [
      // Array of transaction objects
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
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

