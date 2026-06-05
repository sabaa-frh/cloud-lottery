# Cloud Lottery

A full-stack lottery entry management app built with **React** (frontend) and **Node.js + Express** (backend), using **AWS DynamoDB** for storage and **AWS S3** for participant images.

---

## Project Structure

```
cloud-lottery/
├── backend/
│   ├── server.js          # Express API
│   ├── package.json
│   └── .env.example       # Environment variable template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # React app
│   │   ├── App.css        # Lottery theme styles
│   │   └── index.js
│   └── package.json
├── start.sh               # One-command startup script
└── README.md
```

---

## Prerequisites

- Node.js 18+ and npm
- An AWS account with:
  - A **DynamoDB table** named `LotteryEntries` (or your chosen name)
    - Partition key: `entryId` (String)
  - An **S3 bucket** for storing participant images
  - An **IAM user** with permissions: `dynamodb:*` on the table, `s3:PutObject` / `s3:DeleteObject` on the bucket
- AWS credentials (Access Key ID + Secret Access Key)

---

## Setup

### 1. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in your real values:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=my-lottery-images
DYNAMODB_TABLE_NAME=LotteryEntries
PORT=3000
```

### 2. Create the DynamoDB table (AWS Console or CLI)

```bash
aws dynamodb create-table \
  --table-name LotteryEntries \
  --attribute-definitions AttributeName=entryId,AttributeType=S \
  --key-schema AttributeName=entryId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 3. Create the S3 bucket

```bash
aws s3 mb s3://my-lottery-images --region us-east-1
```

Make sure the bucket allows the IAM user to `PutObject` and `DeleteObject`. For public image viewing, add a bucket policy granting `s3:GetObject` to `*` (or use pre-signed URLs for private access).

---

## Running the app

### Option A — One-command start (Linux/macOS)

```bash
chmod +x start.sh
./start.sh
```

This installs all dependencies and starts both servers.

### Option B — Manual start

**Backend:**
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:3000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
PORT=3001 npm start
# Runs on http://localhost:3001
```

---

## Health Check

The backend includes a lightweight health endpoint for local testing and AWS load balancer checks.

```bash
curl http://localhost:3000/health
```

Example URL:

```
http://localhost:3000/health
```

Example response:

```json
{
  "status": "ok",
  "service": "cloud-lottery-backend",
  "timestamp": "2026-06-05T18:30:00.000Z",
  "region": "us-east-1",
  "table": "LotteryEntries"
}
```

For AWS deployment, the Application Load Balancer target group health check path can be set to `/health`.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Backend health check for local testing and ALB health checks |
| `POST` | `/entries` | Create entry (multipart/form-data with `image`) |
| `GET` | `/entries` | List all entries |
| `GET` | `/entries/:id` | Get single entry |
| `PUT` | `/entries/:id` | Update entry (image optional — keeps old image in S3) |
| `DELETE` | `/entries/:id` | Delete entry and its S3 image |

### POST / PUT body fields

| Field | Type | Required |
|-------|------|----------|
| `participantName` | string | Yes |
| `ticketNumber` | string | Yes |
| `email` | string | Yes |
| `image` | file | Yes (POST) / No (PUT) |

---

## DynamoDB Schema

| Attribute | Type | Role |
|-----------|------|------|
| `entryId` | String | Partition key (UUID) |
| `participantName` | String | Full name |
| `ticketNumber` | String | Ticket identifier |
| `email` | String | Contact email |
| `imageUrl` | String | S3 public URL |
| `createdAt` | String | ISO 8601 timestamp |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, plain CSS |
| Backend | Node.js, Express 4 |
| File upload | Multer (memory storage) |
| Database | AWS DynamoDB (via `@aws-sdk/lib-dynamodb`) |
| Object storage | AWS S3 (via `@aws-sdk/client-s3`) |
| AWS SDK | AWS SDK for JavaScript v3 |
