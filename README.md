# AI Job Application Assistant

MVP for an agent-based workflow that compares a user's CV with a job description and generates tailored application material.

## Stack

- React + Vite
- Node.js + Express
- MongoDB
- OpenAI tool calling

## Run Locally

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

Client: http://localhost:5173  
API: http://localhost:4000

`OPENAI_API_KEY` is optional for local demo mode. When it is not set, the backend uses the same tool pipeline with deterministic local generation. `MONGO_URI` is optional; when omitted, results are returned without persistence.

## MVP Flow

1. Upload CV as `.txt`, `.pdf`, or `.docx`
2. Paste a job description
3. Click **Run Agent**
4. Backend runs multiple tools
5. Frontend displays match score, missing skills, tailored CV suggestions, cover letter, and interview questions
