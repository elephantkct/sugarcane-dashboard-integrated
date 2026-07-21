# EDF Sugarcane Survey Dashboard UI

This project is a full-stack dashboard for exploring sugarcane survey data, farmer profiles, analytics, and interactive map-based insights.

## Project Overview

The application combines a React frontend with a FastAPI backend to provide a modern interface for viewing and analyzing survey-related information.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Data handling: Excel import and survey data processing

## Run the Project

### 1. Frontend

From the project root, run:

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

In a separate terminal, run:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes

The dashboard is designed for local development and can be extended with additional analytics and reporting features.
