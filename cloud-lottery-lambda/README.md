# Cloud Lottery — Image Resizer Lambda

An AWS Lambda function (Node.js 18.x) that automatically resizes any image uploaded to an S3 source bucket to **300×300 px** and saves the result to a separate destination bucket.

---

## How it works

```
S3: cloud-lottery-images-yourname
        │  ObjectCreated event
        ▼
   Lambda (this function)
        │  sharp resize 300×300
        ▼
S3: cloud-lottery-resized-yourname
```

---

## Step 1 — Install dependencies

`sharp` bundles native binaries. Because Lambda runs on **Amazon Linux (x64)**, you must install it with the Linux/x64 target regardless of your local OS:

```bash
cd cloud-lottery-lambda

npm install --platform=linux --arch=x64 sharp
npm install @aws-sdk/client-s3
```

> **Windows users:** run this inside WSL, Git Bash, or any Linux shell.  
> Alternatively, use the `--ignore-scripts` workaround and let Lambda build the native binary — but the explicit platform flag is more reliable.

---

## Step 2 — Zip the deployment package

The zip must contain `index.js`, `package.json`, and the `node_modules/` folder at the **top level** (not inside a subdirectory).

**macOS / Linux:**
```bash
zip -r function.zip index.js package.json node_modules/
```

**Windows (PowerShell):**
```powershell
Compress-Archive -Path index.js, package.json, node_modules -DestinationPath function.zip
```

---

## Step 3 — Create & upload the Lambda in the AWS Console

1. Go to **AWS Console → Lambda → Create function**.
2. Choose **Author from scratch**.
3. Set:
   - **Function name:** `cloud-lottery-image-resizer`
   - **Runtime:** `Node.js 18.x`
   - **Architecture:** `x86_64`
4. Click **Create function**.
5. In the **Code** tab, click **Upload from → .zip file**.
6. Upload `function.zip` and click **Save**.
7. In **Runtime settings**, verify the **Handler** is set to `index.handler`.

---

## Step 4 — Set environment variables

In the Lambda console, go to **Configuration → Environment variables → Edit**, and add:

| Key | Value |
|-----|-------|
| `SOURCE_BUCKET` | `cloud-lottery-images-yourname` |
| `DEST_BUCKET` | `cloud-lottery-resized-yourname` |

Click **Save**.

---

## Step 5 — Set the S3 trigger

1. In the Lambda console, click **Add trigger**.
2. Choose **S3**.
3. Set:
   - **Bucket:** `cloud-lottery-images-yourname`
   - **Event types:** `All object create events` (i.e., `s3:ObjectCreated:*`)
   - Leave prefix/suffix empty (or set a suffix like `.jpg,.png` to filter).
4. Check the acknowledgement box and click **Add**.

---

## Step 6 — Set IAM permissions

The Lambda execution role needs permission to **read from the source bucket** and **write to the destination bucket**.

### Option A — AWS Console (quick)

1. Go to **Configuration → Permissions → Execution role → click the role name**.
2. In IAM, click **Add permissions → Attach policies**.
3. Attach **AmazonS3FullAccess** (or create the inline policy below for least privilege).

### Option B — Least-privilege inline policy (recommended)

In IAM → your Lambda role → **Add permissions → Create inline policy → JSON:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSource",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::cloud-lottery-images-yourname/*"
    },
    {
      "Sid": "WriteDestination",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::cloud-lottery-resized-yourname/*"
    }
  ]
}
```

Replace `yourname` with your actual bucket name suffix. Click **Review policy**, name it `LotteryResizerPolicy`, and click **Create policy**.

---

## Testing

1. Upload any image to `cloud-lottery-images-yourname` via the S3 console or CLI:
   ```bash
   aws s3 cp my-photo.jpg s3://cloud-lottery-images-yourname/test/my-photo.jpg
   ```
2. Wait a few seconds, then check the destination bucket:
   ```bash
   aws s3 ls s3://cloud-lottery-resized-yourname/test/
   ```
3. Inspect Lambda logs in **CloudWatch → Log groups → /aws/lambda/cloud-lottery-image-resizer**.

---

## Configuration reference

| Env variable | Description | Example |
|---|---|---|
| `SOURCE_BUCKET` | Bucket that triggers the Lambda | `cloud-lottery-images-yourname` |
| `DEST_BUCKET` | Bucket where resized images are saved | `cloud-lottery-resized-yourname` |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error: Could not load the "sharp" module on the linux-x64 platform` | Re-run `npm install --platform=linux --arch=x64 sharp` and re-zip |
| `AccessDenied` on GetObject | Add `s3:GetObject` permission on the source bucket to the Lambda role |
| `AccessDenied` on PutObject | Add `s3:PutObject` permission on the destination bucket to the Lambda role |
| Lambda times out | Increase the timeout under **Configuration → General configuration** (default 3 s is often too short — set to 30 s) and increase Memory to 512 MB |
| Trigger fires but destination file is 0 bytes | Check CloudWatch logs for a `sharp` error; the source file may not be a supported image format |
