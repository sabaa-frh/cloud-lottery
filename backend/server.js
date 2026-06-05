require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const app = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "LotteryEntries";
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || "us-east-1";

// AWS clients
const dynamoClient = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer — memory storage so we can stream to S3
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadToS3(buffer, key, mimetype) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
}

async function deleteFromS3(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const key = decodeURIComponent(url.pathname.slice(1)); // remove leading /
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("S3 delete error (non-fatal):", err.message);
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /entries — create entry
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "cloud-lottery-backend",
    timestamp: new Date().toISOString(),
    region: REGION,
    table: TABLE_NAME,
  });
});

app.post("/entries", upload.single("image"), async (req, res) => {
  try {
    const { participantName, ticketNumber, email } = req.body;
    if (!participantName || !ticketNumber || !email) {
      return res.status(400).json({ error: "participantName, ticketNumber, and email are required" });
    }

    const entryId = uuidv4();
    const createdAt = new Date().toISOString();
    let imageUrl = "";

    if (req.file) {
      const ext = req.file.originalname.split(".").pop();
      const s3Key = `entries/${entryId}.${ext}`;
      imageUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
    }

    const item = { entryId, participantName, ticketNumber, email, imageUrl, createdAt };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    res.status(201).json(item);
  } catch (err) {
    console.error("POST /entries error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /entries — list all entries
app.get("/entries", async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(items);
  } catch (err) {
    console.error("GET /entries error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /entries/:id — get single entry
app.get("/entries/:id", async (req, res) => {
  try {
    const result = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { entryId: req.params.id } })
    );
    if (!result.Item) return res.status(404).json({ error: "Entry not found" });
    res.json(result.Item);
  } catch (err) {
    console.error("GET /entries/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /entries/:id — update entry (optionally replace image)
app.put("/entries/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch existing item
    const existing = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { entryId: id } })
    );
    if (!existing.Item) return res.status(404).json({ error: "Entry not found" });

    const { participantName, ticketNumber, email } = req.body;
    let imageUrl = existing.Item.imageUrl;

    if (req.file) {
      // Keep old image in S3, upload new one with timestamp suffix
      const ext = req.file.originalname.split(".").pop();
      const timestamp = Date.now();
      const s3Key = `entries/${id}-${timestamp}.${ext}`;
      imageUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
    }

    const updateExprParts = [];
    const exprAttrNames = {};
    const exprAttrValues = {};

    if (participantName !== undefined) {
      updateExprParts.push("#pn = :pn");
      exprAttrNames["#pn"] = "participantName";
      exprAttrValues[":pn"] = participantName;
    }
    if (ticketNumber !== undefined) {
      updateExprParts.push("#tn = :tn");
      exprAttrNames["#tn"] = "ticketNumber";
      exprAttrValues[":tn"] = ticketNumber;
    }
    if (email !== undefined) {
      updateExprParts.push("#em = :em");
      exprAttrNames["#em"] = "email";
      exprAttrValues[":em"] = email;
    }
    if (req.file) {
      updateExprParts.push("#iu = :iu");
      exprAttrNames["#iu"] = "imageUrl";
      exprAttrValues[":iu"] = imageUrl;
    }

    if (updateExprParts.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { entryId: id },
        UpdateExpression: "SET " + updateExprParts.join(", "),
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(result.Attributes);
  } catch (err) {
    console.error("PUT /entries/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /entries/:id — delete entry and its image
app.delete("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { entryId: id } })
    );
    if (!existing.Item) return res.status(404).json({ error: "Entry not found" });

    if (existing.Item.imageUrl) {
      await deleteFromS3(existing.Item.imageUrl);
    }

    await docClient.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { entryId: id } })
    );

    res.json({ message: "Entry deleted successfully", entryId: id });
  } catch (err) {
    console.error("DELETE /entries/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Cloud Lottery backend running on http://localhost:${PORT}`);
});
