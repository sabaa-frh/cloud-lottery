# Cloud Lottery Deployment Checklist

Use this checklist to prepare the Cloud Lottery project for the Cloud Computing milestone demo and final submission.

## 1. Local Run Check

- Install Node.js 18+ and npm.
- Backend:
  ```bash
  cd backend
  npm install
  npm start
  ```
- Frontend:
  ```bash
  cd frontend
  npm install
  PORT=3001 npm start
  ```
- Confirm the backend opens at `http://localhost:3000`.
- Confirm the frontend opens at `http://localhost:3001`.
- Test the health endpoint: `http://localhost:3000/health`.

## 2. Required Environment Variables

Create `backend/.env` from `backend/.env.example`.

Required backend values:

```env
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name_here
DYNAMODB_TABLE_NAME=LotteryEntries
PORT=3000
```

Frontend API URL:

```env
REACT_APP_API_URL=http://localhost:3000
```

For production, set `REACT_APP_API_URL` to the Application Load Balancer URL or the CloudFront/API URL used by the deployed backend.

Never commit `.env`, `.pem`, `.csv`, AWS credentials, or private key files.

## 3. DynamoDB Table

- Create a DynamoDB table named `LotteryEntries`, or update `DYNAMODB_TABLE_NAME`.
- Partition key: `entryId` as a String.
- Confirm the app stores at least these attributes:
  - `entryId`
  - `participantName`
  - `ticketNumber`
  - `email`
  - `imageUrl`
  - `createdAt`
- Use on-demand billing if you want the simplest student setup.

## 4. S3 Bucket

- Create an S3 bucket for participant images.
- Put the bucket name in `S3_BUCKET_NAME`.
- Give the backend permission to upload and delete objects.
- If images must display publicly, configure safe read access or use pre-signed URLs.
- Confirm create, update, and delete flows work with images.
- Confirm image updates retain old and new image objects in S3.

## 5. Lambda Image Resize Requirement

- Create a Lambda function for image resizing.
- Configure it to run only when a new image object is created in the upload bucket.
- Use an S3 event trigger such as `ObjectCreated`.
- Store resized images in the same bucket with a prefix like `resized/`, or use a second bucket.
- Capture a screenshot of:
  - Lambda function page
  - S3 trigger configuration
  - Resized image output in S3

## 6. EC2 Deployment

- Launch at least two EC2 instances.
- Put instances in different Availability Zones in the same AWS region.
- Install Node.js and npm on each instance.
- Clone the GitHub repository on each instance.
- Configure backend environment variables on each instance.
- Run the backend on port `3000`.
- Build and serve the frontend, or deploy the frontend separately through S3/CloudFront.
- Do not terminate instances before grading; stop them if needed.

## 7. Application Load Balancer

- Create an Application Load Balancer.
- Register both EC2 instances in a target group.
- Set the target group health check path to `/health`.
- Confirm both targets become healthy.
- Save the ELB DNS name for final submission.

## 8. High Availability

- Confirm there are multiple EC2 instances.
- Confirm they are in different Availability Zones.
- Confirm the Application Load Balancer distributes traffic across the instances.
- Take screenshots showing:
  - EC2 instances
  - Availability Zones
  - Target group healthy targets
  - Load balancer DNS

## 9. CloudFront Distribution

- Create a CloudFront distribution.
- Use the frontend S3 bucket, ALB, or deployed web app endpoint as the origin depending on your deployment choice.
- Confirm the app loads through the CloudFront domain.
- Save the CloudFront domain name for final submission.
- Take a screenshot of the distribution details.

## 10. Architecture Diagram

- Draw the architecture using AWS standard icons.
- Include:
  - Users
  - CloudFront
  - Application Load Balancer
  - Multiple EC2 instances in different Availability Zones
  - DynamoDB
  - S3 image bucket
  - Lambda image resize function
  - S3 event trigger
- Export the diagram as an image or PDF for submission.

## 11. Screenshots Needed

- Local app running.
- CRUD create/read/update/delete screens.
- Uploaded image displayed in the app.
- DynamoDB table with saved item.
- S3 bucket with uploaded image.
- Lambda trigger and resized output.
- EC2 instances in different Availability Zones.
- ALB target group showing healthy instances.
- CloudFront distribution and working app URL.
- Architecture diagram.

## 12. Demo Recording Checklist

- Start with the deployed app URL.
- Show the health endpoint or ALB health status.
- Create a lottery entry with an image.
- Show the entry appears in the app.
- Show the item in DynamoDB.
- Show the image in S3.
- Update the entry and replace the image.
- Show old and new image objects are retained in S3.
- Delete an entry.
- Show the entry is removed from DynamoDB and the current image is deleted from S3.
- Briefly show Lambda resizing behavior.
- Briefly show the architecture diagram.

## 13. Final Submission Values

Prepare these values before submitting the form:

- GitHub repository link
- ELB DNS name
- CloudFront domain name
- Private IP address of EC2 instance 1
- Private IP address of EC2 instance 2
- Architecture diagram attachment
- Demo recording attachment or link

Known values from the teammate project package:

```text
GitHub repo: https://github.com/sabaa-frh/cloud-lottery
ELB DNS: cloud-lottery-alb-576971168.us-east-1.elb.amazonaws.com
CloudFront domain: d39c2zcex3j5e.cloudfront.net
EC2 private IP 1: 172.31.5.31
EC2 private IP 2: 172.31.83.8
Architecture diagram: cloud-lottery-architecture.drawio
```
