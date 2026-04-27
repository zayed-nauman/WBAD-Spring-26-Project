# ZigZag Delivery Management System

## Project Overview

ZigZag Delivery Management System is a full-stack courier operations application for managing delivery orders, rider assignment, blacklisted customers, shipping labels, and return processing. The system is built for dispatcher-led workflows where one dispatcher role has access to all operational features.

The application helps a delivery team create orders, move orders through delivery lifecycle states, print labels, assign riders based on capacity/location, process complete-order returns, and track returned-order reasons.

## Features

- User authentication with signup, login, logout, and password reset.
- Single dispatcher role with access to all application workflows.
- Order creation, editing, deletion, filtering, and lifecycle status updates.
- Order status workflow including order received, fulfillment, ready for pickup, pickup in progress, picked up, dispatched, in transit, out for delivery, delivered, failed, and returned.
- Label printing for fulfilled and ready-for-pickup orders.
- Label printing automatically moves an order to ready for pickup.
- Printed labels lock order editing from the Orders page.
- Rider assignment workflow for ready-for-pickup orders.
- Assigned orders move from the Orders page into the Order Assignments page.
- Order Assignments page supports rider delivery lifecycle updates and order deletion.
- Rider pool management with create, edit, delete, capacity, weight capacity, location, vehicle, and city details.
- Rider recommendation and assignment based on rider availability, capacity, weight, zone, and distance data.
- Blacklisted number management with single and bulk imports.
- Blacklisted order warnings when modifying, printing labels, or changing status.
- Removing a blacklisted number updates matching active blacklisted orders back to ready for pickup.
- Return processing for complete orders.
- Return summary and confirmation screens.
- Delivered orders can be returned, returned orders show an already-returned message, and other states are blocked from return processing.
- Returned orders appear in the Orders page with returned status.
- Reason for return is saved and displayed on returned orders in the lifecycle status screen.
- Inventory and return-case workflow models for restocking, loss records, and return history.
- PDF shipping label generation.

## Frameworks Used

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Lucide React icons
- CSS modules/stylesheets organized by feature

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JSON Web Tokens for authentication
- bcryptjs for password hashing
- pdfkit for shipping label generation
- dotenv for environment configuration
- cors for frontend/backend communication
- nodemon for local backend development

## Setup Steps

### Prerequisites

- Node.js installed
- npm installed
- PostgreSQL database available locally or through a hosted provider
- A valid backend `.env` file
- A valid frontend `.env` file

### 1. Clone or Open the Project

```bash
cd WBAD-Spring-26-Project
```

### 2. Configure Backend Environment

Create or update `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your-secret-key"
PORT=3000
```

### 3. Configure Frontend Environment

Create or update `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Apply Database Schema

For a new or development database:

```bash
npx prisma db push
```

If Prisma warns about development data loss and you accept that for your local database:

```bash
npx prisma db push --accept-data-loss
```


### 7. Run the Backend

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

### 8. Install Frontend Dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

### 10. Run the Frontend

```bash
npm run dev
```

The frontend usually runs at:

```text
http://localhost:5173
```

### 9. Build for Production

Backend module validation:

```bash
cd backend
npm run test:ci:modules
```

Frontend build:

```bash
cd frontend
npm run build
```

## Team Contributions

- Gehna Bhatia: Order workflow, Lifecycle management, blacklist handling, authentication, UI integration, and debugging.
- Muhammad Zayed Nauman: Full-stack implementation, Rider assignment, Rider API, Order Lifecycle processing, authentication, DB updates, UI integration, and debugging.
- Arbaaz Murtaza: Return processing, authentication, Prisma schema updates, Deployment and CI/CD Pipeline



