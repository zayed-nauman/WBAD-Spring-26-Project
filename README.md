# WBAD-Spring-26-Project

# Courier Management API Documentation

Base URL: `http://localhost:3000`

All routes except `/` and `/api/auth/*` require a Bearer token:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Health Check

### GET /
Returns a simple health message.

**Response**
```json
{
  "message": "Courier Management API is running!"
}
```

---

## Authentication

### POST /api/auth/register
Register a user.

**Request body**
```json
{
  "name": "Zayed Nauman",
  "email": "zayed@courier.com",
  "password": "password123",
  "role": "dispatcher"
}
```

**Notes**
- `role` is optional in the current codebase.
- If omitted, the backend defaults to `dispatcher`.
- Current schema stores one `User` model with a free-text `role` string.

**Success response**
```json
{
  "message": "User registered",
  "userId": 1
}
```

**Failure response**
```json
{
  "error": "Email already exists"
}
```

### POST /api/auth/login
Login and receive a JWT.

**Request body**
```json
{
  "email": "zayed@courier.com",
  "password": "password123"
}
```

**Success response**
```json
{
  "token": "<JWT_TOKEN>",
  "user": {
    "id": 1,
    "name": "Zayed Nauman",
    "role": "dispatcher"
  }
}
```

**Failure response**
```json
{
  "error": "Invalid email or password"
}
```

---

## Orders

### Order fields currently used by the backend
- `customerName` - string
- `phoneNumber` - string
- `address` - string
- `city` - string
- `items` - string
- `paymentType` - string, usually `COD` or `PAID`
- `codAmount` - number or null
- `isFragile` - boolean
- `status` - free-text string in current implementation
- `labelGenerated` - boolean
- `isBlacklisted` - boolean

### GET /api/orders
List all orders.

**Success response**
```json
[
  {
    "id": 1,
    "trackingNumber": "cm123...",
    "customerName": "Ali Hassan",
    "phoneNumber": "03001234567",
    "address": "House 12, Block B, Gulshan",
    "city": "Karachi",
    "items": "Laptop, Charger",
    "paymentType": "COD",
    "codAmount": 85000,
    "isFragile": true,
    "isBlacklisted": false,
    "status": "ORDER_RECEIVED",
    "labelGenerated": false,
    "createdAt": "2026-04-01T12:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z",
    "createdBy": 1,
    "riderAssignment": null
  }
]
```

### GET /api/orders/:id
Get a single order by ID.

**Success response**
```json
{
  "id": 1,
  "trackingNumber": "cm123...",
  "customerName": "Ali Hassan",
  "phoneNumber": "03001234567",
  "address": "House 12, Block B, Gulshan",
  "city": "Karachi",
  "items": "Laptop, Charger",
  "paymentType": "COD",
  "codAmount": 85000,
  "isFragile": true,
  "isBlacklisted": false,
  "status": "ORDER_RECEIVED",
  "labelGenerated": false,
  "riderAssignment": null,
  "returnCase": null
}
```

**Not found**
```json
{
  "error": "Order not found"
}
```

### POST /api/orders
Create an order.

**Request body**
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

**What the backend currently does**
- checks whether `phoneNumber` exists in `BlacklistedNumber`
- stores the order
- sets `isBlacklisted` automatically
- does **not** geocode the order address
- does **not** enforce the full workflow state machine

**Success response**
```json
{
  "message": "Order created",
  "order": {
    "id": 1,
    "trackingNumber": "cm123...",
    "customerName": "Ali Hassan",
    "phoneNumber": "03001234567",
    "address": "House 12, Block B, Gulshan",
    "city": "Karachi",
    "items": "Laptop, Charger",
    "paymentType": "COD",
    "codAmount": 85000,
    "isFragile": true,
    "isBlacklisted": false,
    "status": "ORDER_RECEIVED",
    "labelGenerated": false,
    "createdBy": 1
  },
  "isBlacklisted": false
}
```

### PUT /api/orders/:id/status
Update an order status.

**Request body**
```json
{
  "status": "IN_TRANSIT"
}
```

**Current behavior**
- accepts any string
- does **not** validate against a fixed enum
- does **not** enforce allowed transitions

**Success response**
```json
{
  "message": "Status updated",
  "order": {
    "id": 1,
    "status": "IN_TRANSIT"
  }
}
```

### PUT /api/orders/:id/generate-label
Marks the order label as generated and sets status to `READY_FOR_PICKUP`.

**Current behavior**
- does **not** generate a real PDF file
- only flips `labelGenerated = true`
- updates the status to `READY_FOR_PICKUP`

**Success response**
```json
{
  "message": "Label generated",
  "order": {
    "id": 1,
    "labelGenerated": true,
    "status": "READY_FOR_PICKUP"
  }
}
```

### DELETE /api/orders/:id
Delete an order.

**Success response**
```json
{
  "message": "Order deleted"
}
```

---

## Riders

### Rider fields currently used by the backend
- `name` - string
- `phone` - string
- `zone` - string
- `isAvailable` - boolean
- `currentLoad` - integer
- `maxLoad` - integer
- `currentWeight` - number
- `maxWeight` - number
- `latitude` - number or null
- `longitude` - number or null

### GET /api/riders
List all riders.

**Success response**
```json
[
  {
    "id": 1,
    "name": "Rider A",
    "phone": "03111222333",
    "zone": "Karachi",
    "isAvailable": true,
    "currentLoad": 2,
    "maxLoad": 28,
    "currentWeight": 0,
    "maxWeight": 40,
    "latitude": 24.9411696,
    "longitude": 67.1145379
  }
]
```

### POST /api/riders
Create a rider.

**Request body**
```json
{
  "name": "Rider A",
  "phone": "03111222333",
  "zone": "Karachi",
  "maxLoad": 28,
  "maxWeight": 40,
  "latitude": 24.9411696,
  "longitude": 67.1145379
}
```

**Success response**
```json
{
  "message": "Rider created",
  "rider": {
    "id": 1,
    "name": "Rider A",
    "phone": "03111222333",
    "zone": "Karachi",
    "isAvailable": true,
    "currentLoad": 0,
    "maxLoad": 28,
    "currentWeight": 0,
    "maxWeight": 40,
    "latitude": 24.9411696,
    "longitude": 67.1145379
  }
}
```

### PUT /api/riders/:id
Update rider details.

**Request body**
```json
{
  "name": "Rider A Updated",
  "phone": "03111222333",
  "zone": "Karachi",
  "isAvailable": true,
  "maxLoad": 30,
  "maxWeight": 45
}
```

**Current behavior**
- updates basic rider fields
- does **not** update rider latitude/longitude in the current service implementation

**Success response**
```json
{
  "message": "Rider updated",
  "rider": {
    "id": 1,
    "name": "Rider A Updated",
    "zone": "Karachi"
  }
}
```

### DELETE /api/riders/:id
Delete a rider.

**Success response**
```json
{
  "message": "Rider deleted"
}
```

### GET /api/riders/recommend/:orderId
Recommend riders for an existing order.

**Current behavior**
- loads the order
- filters riders by `zone = order.city`
- excludes riders over `maxLoad`
- sorts by a simple internal score based on spare load
- returns top 3
- does **not** use geocoding or distance here

**Success response**
```json
[
  {
    "id": 2,
    "name": "Rider B",
    "phone": "03112223334",
    "zone": "Karachi",
    "isAvailable": true,
    "currentLoad": 4,
    "maxLoad": 28,
    "score": 86
  }
]
```

### POST /api/riders/recommend
Recommend riders by a free-form delivery address and zone.

This is the geocoding-based recommendation route.

**Request body**
```json
{
  "deliveryAddress": "24th Street, Tauheed Commercial Area, Phase 5, DHA, Karachi, Pakistan",
  "zone": "Karachi"
}
```

**What the backend currently does**
- geocodes `deliveryAddress` using Nominatim
- uses `q`, `format=jsonv2`, `limit=1`, `addressdetails=1`, `countrycodes=pk`
- filters riders by the given zone
- requires rider `latitude` and `longitude`
- calculates Haversine distance in kilometers
- returns riders sorted by minimum distance

**Success response**
```json
{
  "destination": {
    "address": "24th Street, Tauheed Commercial Area, DHA Phase 5, Karachi, Pakistan",
    "latitude": 24.81052,
    "longitude": 67.02891
  },
  "topRider": {
    "id": 1,
    "name": "Rider A",
    "distanceKm": 4.82,
    "depotLatitude": 24.9411696,
    "depotLongitude": 67.1145379,
    "currentLoad": 2,
    "maxLoad": 28
  },
  "recommendations": [
    {
      "id": 1,
      "name": "Rider A",
      "distanceKm": 4.82,
      "depotLatitude": 24.9411696,
      "depotLongitude": 67.1145379,
      "currentLoad": 2,
      "maxLoad": 28
    },
    {
      "id": 3,
      "name": "Rider C",
      "distanceKm": 7.35,
      "depotLatitude": 24.88,
      "depotLongitude": 67.05,
      "currentLoad": 1,
      "maxLoad": 28
    }
  ]
}
```

**Failure response**
```json
{
  "error": "deliveryAddress and zone are required"
}
```

### POST /api/riders/assign
Assign a rider to an order.

**Request body**
```json
{
  "orderId": 1,
  "riderId": 1
}
```

**Current behavior**
- creates a `RiderAssignment`
- increments rider `currentLoad`
- sets order status to `PICKUP_IN_PROGRESS`
- does **not** re-check weight limit or exact workflow state before assignment

**Success response**
```json
{
  "message": "Rider assigned",
  "assignment": {
    "id": 1,
    "orderId": 1,
    "riderId": 1,
    "assignedAt": "2026-04-01T12:30:00.000Z",
    "status": "ASSIGNED"
  }
}
```

---

## Return Cases

### Return case fields currently used by the backend
- `orderId` - integer
- `reason` - string
- `condition` - string or null
- `refundStatus` - string
- `isRestocked` - boolean

### GET /api/returns
List all return cases.

**Success response**
```json
[
  {
    "id": 1,
    "orderId": 1,
    "reason": "Customer refused COD",
    "condition": null,
    "refundStatus": "NOT_APPLICABLE",
    "isRestocked": false,
    "order": {
      "id": 1,
      "status": "RETURN_INITIATED"
    }
  }
]
```

### GET /api/returns/:id
Get a single return case.

**Success response**
```json
{
  "id": 1,
  "orderId": 1,
  "reason": "Customer refused COD",
  "condition": null,
  "refundStatus": "NOT_APPLICABLE",
  "isRestocked": false,
  "order": {
    "id": 1,
    "status": "RETURN_INITIATED"
  }
}
```

### POST /api/returns
Create a return case.

**Request body**
```json
{
  "orderId": 1,
  "reason": "Customer refused to accept COD payment"
}
```

**Current behavior**
- creates the return case
- sets order status to `RETURN_INITIATED`
- does **not** enforce refund approval logic for COD

**Success response**
```json
{
  "message": "Return case created",
  "returnCase": {
    "id": 1,
    "orderId": 1,
    "reason": "Customer refused to accept COD payment",
    "refundStatus": "NOT_APPLICABLE",
    "isRestocked": false
  }
}
```

### PUT /api/returns/:id
Update a return case.

**Request body**
```json
{
  "condition": "RESELLABLE",
  "refundStatus": "REFUND_REQUESTED",
  "isRestocked": true
}
```

**Current behavior**
- updates the return case
- if `isRestocked = true`, sets order status to `RESTOCKED`
- does **not** manage inventory counts

**Success response**
```json
{
  "message": "Return case updated",
  "returnCase": {
    "id": 1,
    "orderId": 1,
    "condition": "RESELLABLE",
    "refundStatus": "REFUND_REQUESTED",
    "isRestocked": true
  }
}
```

### DELETE /api/returns/:id
Delete a return case.

**Success response**
```json
{
  "message": "Return case deleted"
}
```

---

## Blacklist

### GET /api/blacklist
List all blacklisted phone numbers.

**Success response**
```json
[
  {
    "id": 1,
    "phoneNumber": "03009998888",
    "reason": "Repeated failed COD deliveries",
    "createdAt": "2026-04-01T11:00:00.000Z"
  }
]
```

### POST /api/blacklist
Add a number to the blacklist.

**Request body**
```json
{
  "phoneNumber": "03009998888",
  "reason": "Repeated failed COD deliveries"
}
```

**Success response**
```json
{
  "message": "Number blacklisted",
  "entry": {
    "id": 1,
    "phoneNumber": "03009998888",
    "reason": "Repeated failed COD deliveries"
  }
}
```

### DELETE /api/blacklist/:id
Delete a blacklisted number.

**Success response**
```json
{
  "message": "Number removed from blacklist"
}
```

---

## Authentication notes

Use the JWT from `/api/auth/login` in all protected routes:

```http
Authorization: Bearer eyJhbGciOi...
```

If the token is missing:
```json
{
  "error": "No token provided"
}
```

If the token is invalid:
```json
{
  "error": "Invalid token"
}
```

---

## Nominatim geocoding route details used by the backend

The backend geocoding helper currently sends this request shape:

**Endpoint**
```http
GET https://nominatim.openstreetmap.org/search
```

**Query params**
```text
q=<free-form delivery address>
format=jsonv2
limit=1
addressdetails=1
countrycodes=pk
```

**Headers**
```http
User-Agent: RiderAssignmentApp/1.0 (zayednauman@gmail.com)
Accept: application/json
```

The backend extracts:
- `response.data[0].lat`
- `response.data[0].lon`
- `response.data[0].display_name`

It then uses Haversine distance to compare destination coordinates to rider depot coordinates.

---

## Known gaps between this documentation and the intended full workflow

The current codebase exposes the routes above, but it still does **not** fully implement the complete TA workflow. The biggest remaining gaps are:

- no separate portals or guarded route sets for admin, dispatcher, rider, and customer
- no customer-facing order placement/history portal beyond generic order CRUD
- no enforced fulfillment stage field (`FULFILLED` / `UNFULFILLED`)
- no strict enum/state machine for all workflow stages
- no real PDF label generation yet
- no rider notification service on assignment
- no rider-specific endpoint for updating only their assigned orders
- no stock or inventory management module
- no COD refund approval enforcement

So this document is an accurate **route-level API reference for the current code**, not a claim that the full assignment has already been completed.
