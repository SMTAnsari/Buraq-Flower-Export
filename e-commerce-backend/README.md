# Buraq Flower Exports — Backend API

Node.js / Express / MongoDB REST API for the Buraq Flower Exports e-commerce platform.

## Tech Stack
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 5
- **Database**: MongoDB Atlas via Mongoose 8
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **File Upload**: Multer → Cloudinary
- **Caching**: Redis (optional, graceful fallback)
- **PDF**: PDFKit (invoices)
- **Payments**: Razorpay

## Setup

```bash
cd server
cp .env.example .env        # fill in your values
npm install
npm run dev                 # nodemon auto-reload
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Production start |
| `npm run dev` | Development with nodemon |
| `npm run migrate:units` | Backfill unitType/stockUnit on existing products |
| `npm run seed:reviews` | Seed 3–5 temp reviews (4–5 stars) per product |

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register user/seller |
| POST | `/login` | — | Login |
| GET | `/profile` | ✅ | Get current user |
| GET | `/wishlist` | ✅ | Get wishlist |
| POST | `/wishlist` | ✅ | Update wishlist |

### Products — `/api/products`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List products (paginated) |
| GET | `/:id` | — | Get single product |
| POST | `/` | seller/admin | Create product |
| PUT | `/:id` | seller/admin | Update product |
| DELETE | `/:id` | seller/admin | Delete product |

### Orders — `/api/orders`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | user | Place order |
| GET | `/my-orders` | user | My orders |
| PUT | `/:id/cancel` | user | Cancel order |
| GET | `/:id/invoice` | user/admin | Download PDF invoice |
| PUT | `/:id/status` | admin | Update order status |

### Admin — `/api/admin`
Full CRUD for users, products, orders, sellers, coupons, reviews.

### Seller — `/api/seller`
Seller dashboard: products, orders, stats, analytics, restock.

## Unit System
Products support `unitType`: `weight` | `piece` | `count`

- **Weight products** (`stockUnit: kg/gram`): stock stored in grams internally
- **Piece products**: stock = piece count
- **Count products**: default behaviour

## Environment Variables
See `.env.example` for all required variables.
