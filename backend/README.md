# Courier Delivery Management System — Backend

## Group Members
- Muhammad Zayed Nauman (29047)
- Gehna Bhatia (29054)
- Arbaaz Murtaza (29050)

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma v6
- **Auth**: JSON Web Tokens (JWT)

---

## Setup Instructions

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### Steps

1. Clone the repository
2. Install dependencies:
```
npm install
```
3. Create a `.env` file in the root directory:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/WebDevProjDB?schema=public"
JWT_SECRET="secret123"
```
4. Run database migrations:
```
npx prisma migrate dev --name init
```
5. Start the server:
```
npm run dev
```
Server runs on `http://localhost:3000`

---

## API Endpoints

### Auth Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and receive JWT token |

### Order Routes (require Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders | Get all orders |
| GET | /api/orders/:id | Get single order |
| POST | /api/orders | Create new order |
| PUT | /api/orders/:id/status | Update order status |
| PUT | /api/orders/:id/generate-label | Generate shipping label |
| DELETE | /api/orders/:id | Delete an order |

### Rider Routes (require Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/riders | Get all riders |
| GET | /api/riders/recommend/:orderId | Get top 3 recommended riders |
| POST | /api/riders | Create new rider |
| POST | /api/riders/assign | Assign rider to order |
| PUT | /api/riders/:id | Update rider details |
| DELETE | /api/riders/:id | Delete a rider |

### Returns Routes (require Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/returns | Get all return cases |
| GET | /api/returns/:id | Get single return case |
| POST | /api/returns | Create return case |
| PUT | /api/returns/:id | Update return case |
| DELETE | /api/returns/:id | Delete return case |

### Blacklist Routes (require Bearer Token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/blacklist | Get all blacklisted numbers |
| POST | /api/blacklist | Add number to blacklist |
| DELETE | /api/blacklist/:id | Remove number from blacklist |

---

## Example Requests

### Register
**POST** `/api/auth/register`
```json
{
  "name": "Zayed Nauman",
  "email": "zayed@courier.com",
  "password": "password123",
  "role": "dispatcher"
}
```

### Create Order
**POST** `/api/orders`
```json
{
  "customerName": "Ali Hassan",
  "phoneNumber": "03001234567",
  "address": "House 12, Block B, Gulshan",
  "city": "Karachi",
  "items": "Laptop, Charger",
  "paymentType": "COD",
  "codAmount": 85000,
  "isFragile": true
}
```

### Assign Rider
**POST** `/api/riders/assign`
```json
{
  "orderId": 1,
  "riderId": 1
}
```

### Create Return Case
**POST** `/api/returns`
```json
{
  "orderId": 1,
  "reason": "Customer refused to accept COD payment"
}
```