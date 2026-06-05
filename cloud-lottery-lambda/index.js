const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});

const SOURCE_BUCKET = process.env.SOURCE_BUCKET;
const DEST_BUCKET = process.env.DEST_BUCKET;

exports.handler = async (event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const sourceBucket = record.s3.bucket.name;

    console.log(`Processing: s3://${sourceBucket}/${key}`);

    try {
      // Download original image from S3
      const getResponse = await s3.send(
        new GetObjectCommand({ Bucket: SOURCE_BUCKET || sourceBucket, Key: key })
      );

      // stream → Buffer
      const chunks = [];
      for await (const chunk of getResponse.Body) {
        chunks.push(chunk);
      }
      const inputBuffer = Buffer.concat(chunks);

      // Resize to 300×300, keeping aspect ratio and cropping to fill
      const resizedBuffer = await sharp(inputBuffer)
        .resize(300, 300, { fit: "cover", position: "centre" })
        .toBuffer();

      // Upload resized image to destination bucket under the same key
      await s3.send(
        new PutObjectCommand({
          Bucket: DEST_BUCKET,
          Key: key,
          Body: resizedBuffer,
          ContentType: getResponse.ContentType,
        })
      );

      console.log(`Resized and saved: s3://${DEST_BUCKET}/${key}`);
    } catch (err) {
      console.error(`Error processing s3://${sourceBucket}/${key}:`, err);
      // Re-throw so Lambda marks this record as failed
      throw err;
    }
  }
};
