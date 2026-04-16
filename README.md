# Sains POS

Sains POS is a small point-of-sale application built for day-to-day restaurant or cafe operations.  
The project covers the common workflow: login by role, manage products, handle dine-in and takeaway orders, save open bills by table, complete payments, and review sales activity.

This repository is organized as a simple monorepo:

- `client` for the React + Vite frontend
- `server` for the Express + MongoDB backend

## Tech Stack

- React 18
- Vite
- Node.js
- Express
- MongoDB
- Mongoose

## What The App Does

- Role-based login for `admin` and `cashier`
- Admin dashboard and sales reports
- Product management with optional categories
- Inventory tracking for selected products
- Table management and active dine-in bills
- POS flow for dine-in and takeaway
- Transaction history for `PAID` and `CANCEL`
- Receipt export and Excel report export


## Getting Started

1. Install dependencies

```bash
npm install
```

2. Create local environment files

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

3. Update `server/.env`

Set your MongoDB connection string and any local values needed for development.

4. Seed the first admin account

```bash
npm run seed:admin
```

5. Run the app

Backend:

```bash
npm run dev:server
```

Frontend:

```bash
npm run dev:client
```

If you want both workspaces active during development, you can also use:

```bash
npm run dev
```

## Build

Build the client:

```bash
npm run build
```

Run the backend in production mode:

```bash
npm run start
```




