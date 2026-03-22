# Sains POS

Sains POS is a MERN-based point-of-sale application for small food and beverage businesses.
This workspace is organized as a small monorepo with separate `server` and `client`
applications.

## Stack

- MongoDB on a local server
- Express.js and Node.js for the backend API
- React with Vite for the frontend

## Project Structure

```text
.
├── client/
├── server/
├── package.json
└── README.md
```

## Current Scope

- Role-based login for `admin` and `cashier`
- Admin user management
- Product and inventory management
- Restaurant table billing with active bill stored on each table
- Transaction history with `paid` and `cancel` status

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment templates:

   ```bash
   copy server\\.env.example server\\.env
   copy client\\.env.example client\\.env
   ```

3. Update the MongoDB URI in `server/.env`.

4. Seed the first admin:

   ```bash
   npm run seed:admin
   ```

5. Start the backend and frontend in separate terminals:

   ```bash
   npm run dev:server
   npm run dev:client
   ```

## Notes

- For checkout consistency on a standalone MongoDB instance, the current implementation
  validates stock before decrementing inventory. If you later need strict multi-document
  atomicity, run MongoDB as a replica set and wrap checkout in transactions.
