# Dawami Backend - MVP

A Node.js backend API for Dawami, a job matching application that uses AI to match candidates with job opportunities.

## Features

- **User Authentication**: JWT-based authentication for candidates and employers
- **Candidate Management**: Profile creation, CV upload, and video intro upload
- **Employer Management**: Company profile and job posting
- **AI-Powered Matching**: Automatic matching using OpenAI to score candidate-job compatibility
- **CV Parsing**: Automatic extraction of skills, languages, and summary from CVs
- **Job Parsing**: Automatic extraction of key requirements from job descriptions
- **Email Notifications**: Automated email notifications when candidates are shortlisted
- **File Storage**: Local file storage for CVs and videos (easily replaceable with cloud storage)

## Tech Stack

- **Node.js** with Express
- **PostgreSQL** database
- **Sequelize** ORM
- **OpenAI** API for AI features
- **JWT** for authentication
- **AWS S3** for file storage (CVs and videos)
- **Multer** for file uploads
- **Nodemailer** for email sending

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- AWS S3 bucket and credentials
- OpenAI API key
- SMTP email server credentials

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dawami-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

   - Database credentials
   - AWS S3 credentials (Access Key ID, Secret Access Key, Region, Bucket Name)
   - JWT secret
   - OpenAI API key
   - SMTP email server credentials (SMTP_HOST, SMTP_PORT, EMAIL_USER, EMAIL_PASSWORD)

5. Create the PostgreSQL database:

```bash
createdb dawami_dev
```

6. Run migrations:

```bash
npm run migrate
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user (candidate or employer)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Candidate Endpoints

- `GET /api/candidates/profile` - Get candidate profile
- `PUT /api/candidates/profile` - Update candidate profile
- `POST /api/candidates/cv` - Upload CV (PDF)
- `POST /api/candidates/video` - Upload video intro

### Employer Endpoints

- `GET /api/employers/profile` - Get employer profile
- `PUT /api/employers/profile` - Update employer profile

### Job Endpoints

- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - Get all jobs for the employer
- `GET /api/jobs/:id` - Get a specific job
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job

### Match Endpoints

- `GET /api/matches/job/:jobId` - Get matches for a job (employer)
- `POST /api/matches/:matchId/reject` - Reject a candidate match
- `POST /api/matches/:matchId/shortlist` - Shortlist a candidate (sends email notification)
- `GET /api/matches/candidate/matches` - Get matches for a candidate

## Database Migrations

### Run migrations

```bash
npm run migrate
```

### Rollback migrations

```bash
npm run migrate:undo
```

## Project Structure

```
src/
├── config/          # Configuration files (database, etc.)
├── controllers/     # Request handlers
├── middleware/      # Express middleware (auth, etc.)
├── migrations/      # Database migrations
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
└── app.js           # Express app entry point
```

## Environment Variables

Required environment variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL database configuration
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3 configuration
- `JWT_SECRET` - Secret key for JWT token signing
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SMTP_HOST`, `SMTP_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` - SMTP email server credentials
- `EMAIL_FROM` - Email address to send from
- `PORT` - Server port (default: 3000)

See `.env.example` for the complete list.

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## File Uploads

- CVs must be PDF files
- Videos must be MP4, WebM, or QuickTime format
- Maximum file size: 10MB
- Files are stored in AWS S3
- Files are uploaded directly to S3 and URLs are stored in the database

## AI Matching

The system automatically:

1. Parses CVs when uploaded to extract skills, languages, and summary
2. Parses job descriptions when created to extract requirements
3. Matches candidates to jobs (or jobs to candidates) when new data is added
4. Calculates match scores (0-100) using AI

## Email Notifications

When an employer shortlists a candidate:

- An email notification is sent to the candidate
- The email includes job title and company name
- Supports both English and Arabic (configurable)

## Development Notes

- The database models use UUIDs for primary keys
- All timestamps are stored in UTC
- File uploads are stored locally but can be easily replaced with cloud storage (S3, etc.)
- The AI service uses OpenAI's API - ensure you have sufficient API credits

## Production Considerations

1. **Database**: Use a managed PostgreSQL service (AWS RDS, Heroku Postgres, etc.)
2. **File Storage**: AWS S3 is already configured. Ensure proper bucket permissions and CORS settings
3. **Environment Variables**: Use secure environment variable management (AWS Secrets Manager, etc.)
4. **JWT Secret**: Use a strong, randomly generated secret
5. **HTTPS**: Always use HTTPS in production
6. **Rate Limiting**: Implement rate limiting for API endpoints
7. **Error Logging**: Set up proper error logging and monitoring
8. **Database Backups**: Implement regular database backups
9. **S3 Bucket Policy**: Configure appropriate bucket policies for public/private file access
10. **CDN**: Consider using CloudFront in front of S3 for better performance
