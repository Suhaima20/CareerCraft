# CareerCraft

## AI Skill Gap & Career Intelligence Platform

CareerCraft is a full-stack career intelligence platform designed to help students, freshers, and professionals understand their career readiness, identify skill gaps, explore suitable career paths, build personalized learning roadmaps, and discover relevant job opportunities.

The platform combines a **React + Vite frontend**, **Python Flask backend**, **MongoDB**, **spaCy NLP**, deterministic skill matching, and external job data to provide a structured career development experience.

---

## Table of Contents

* [Overview](#overview)
* [Problem Statement](#problem-statement)
* [Objectives](#objectives)
* [Key Features](#key-features)
* [System Workflow](#system-workflow)
* [Technology Stack](#technology-stack)
* [Project Architecture](#project-architecture)
* [Database](#database)
* [Job Intelligence](#job-intelligence)
* [Notification System](#notification-system)
* [Installation and Setup](#installation-and-setup)
* [MongoDB Setup](#1-mongodb-setup)
* [Backend Virtual Environment](#2-backend-virtual-environment)
* [Install Backend Requirements](#3-install-backend-requirements)
* [Install spaCy Model](#4-install-the-spacy-model)
* [Backend Configuration](#5-configure-the-backend)
* [Create First Admin](#6-create-the-first-admin)
* [Import Career Dataset](#7-import-the-excel-dataset)
* [Start Flask](#8-start-flask)
* [Frontend Configuration](#9-configure-the-frontend)
* [Start React](#10-start-react)
* [Deployment](#deployment)
* [Troubleshooting](#troubleshooting)
* [Project Status](#project-status)
* [Future Enhancements](#future-enhancements)

---

# Overview

Choosing a career is often difficult because users may not know:

* Which careers match their current skills
* Which skills they are missing
* What they should learn next
* Whether their resume matches their target career
* Which jobs are relevant to their career path
* How their skills compare with current market requirements

CareerCraft addresses these problems through a centralized career intelligence platform.

Instead of simply displaying career information, CareerCraft analyzes the user's existing profile and skills and generates career-specific guidance.

---

# Problem Statement

Students and early-career professionals often rely on scattered sources to understand career requirements, learn missing skills, improve resumes, and search for jobs.

This creates several problems:

* Lack of personalized career guidance
* Difficulty identifying skill gaps
* Generic learning recommendations
* Difficulty connecting learning with real job opportunities
* Limited visibility into current job-market requirements
* Lack of a single platform connecting career selection, skill analysis, learning, and job discovery

CareerCraft aims to provide these capabilities through one integrated platform.

---

# Objectives

The main objectives of CareerCraft are to:

1. Analyze a user's current skills.
2. Compare user skills with career requirements.
3. Identify missing skills.
4. Recommend suitable career paths.
5. Generate personalized learning roadmaps.
6. Analyze uploaded resumes using NLP.
7. Provide relevant external job opportunities.
8. Generate career-specific job notifications.
9. Track learning progress.
10. Provide career and market intelligence through dashboards.

---

# Key Features

## 1. User Authentication

CareerCraft provides secure authentication using:

* JWT authentication
* Password hashing with bcrypt
* User and administrator roles
* Protected API routes

---

## 2. Career Selection

Users can select a target career and use it as the basis for:

* Skill analysis
* Skill-gap identification
* Learning roadmap generation
* Job recommendations
* Job notifications

---

## 3. Resume Upload and NLP Analysis

Users can upload their resume in PDF format.

CareerCraft processes the resume using:

* PDF text extraction
* spaCy NLP
* MongoDB-based skill matching
* Deterministic skill identification

The system compares the extracted skills against the requirements of the selected career.

CareerCraft does not fabricate skills or career requirements.

---

## 4. Skill Gap Analysis

The platform identifies:

### Existing Skills

Skills already present in the user's profile or resume.

### Missing Skills

Skills required by the selected career but not currently detected in the user's profile.

This allows users to understand exactly what they need to improve.

---

## 5. Career Recommendation

CareerCraft can recommend alternative career paths based on the user's existing skill profile.

The recommendation system uses deterministic skill matching rather than relying on an LLM to generate arbitrary recommendations.

---

## 6. Personalized Learning Roadmap

The learning roadmap converts missing skills into structured learning chapters.

The roadmap is personalized according to the user's selected career and identified skill gaps.

Users can track completed chapters and monitor their learning progress.

---

## 7. Job Opportunities

CareerCraft provides external job opportunities relevant to technology and engineering careers.

The job module supports:

* Job search
* Career-related job discovery
* Company information
* Location
* Job category
* Posted date
* Salary information when available
* External application links
* Pagination
* Search filtering

Jobs are sourced from an external job-data provider and are not fabricated by CareerCraft.

---

## 8. Career-Specific Job Notifications

CareerCraft can generate notifications based on the user's active career.

For example:

> A user whose active career is Data Analyst can receive notifications for Data Analyst and Business Intelligence Analyst opportunities.

The notification system:

* Searches for career-specific jobs
* Removes duplicate jobs
* Stores notifications in MongoDB
* Displays notification timestamps
* Allows individual notifications to be marked as read
* Allows all notifications to be marked as read
* Provides the original external job link where available

---

## 9. Dashboard

The dashboard provides a centralized view of the user's career progress and relevant information.

Depending on the configured modules, it can include:

* Career information
* Skill analysis
* Roadmap progress
* Achievements
* Job notifications
* Market intelligence
* Career statistics

---

## 10. Achievements and Progress

CareerCraft tracks learning activity and progress.

The system can maintain:

* Completed roadmap chapters
* Progress statistics
* Achievements
* Learning streak information

---

## 11. Market Intelligence

CareerCraft supports market intelligence through Power BI integration and administrator-curated market data.

Market information can be used to provide insights into:

* Career demand
* Skills
* Job-market trends
* Industry information

---

# System Workflow

```text
                    ┌─────────────────────┐
                    │      User           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authentication      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Career Selection    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             Resume Upload          Manual Skills
                    │                     │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Skill Extraction    │
                    │     + Matching      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Skill Gap Analysis  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          Career Recommendation    Learning Roadmap
                                          │
                                          ▼
                                   Progress Tracking

                               │
                               ▼
                    ┌─────────────────────┐
                    │ Job Intelligence    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               Job Search          Notifications
```

---

# Technology Stack

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| Frontend          | React.js                            |
| Build Tool        | Vite                                |
| Styling           | Tailwind CSS                        |
| Backend           | Python Flask                        |
| Database          | MongoDB                             |
| Authentication    | JWT                                 |
| Password Security | bcrypt                              |
| NLP               | spaCy                               |
| Resume Processing | PDF extraction                      |
| Job Data          | External job-data provider / Adzuna |
| Analytics         | Power BI                            |
| Deployment        | Netlify + Python hosting            |
| Version Control   | Git & GitHub                        |

---

# Project Architecture

```text
CareerCraft/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   │
│   ├── models/
│   │
│   ├── nlp/
│   │
│   ├── routes/
│   │   ├── achievements.py
│   │   ├── analysis.py
│   │   ├── careers.py
│   │   ├── feedback.py
│   │   ├── jobs.py
│   │   ├── market.py
│   │   ├── notifications.py
│   │   ├── skills.py
│   │   └── users.py
│   │
│   ├── services/
│   │   ├── achievements.py
│   │   ├── analysis.py
│   │   ├── job_notification.py
│   │   ├── roadmap.py
│   │   └── streak.py
│   │
│   ├── scripts/
│   │
│   ├── utils/
│   │
│   └── requirements.txt
│
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── App.jsx
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .env.example
└── README.md
```

---

# Database

MongoDB is the primary data store for CareerCraft.

The database can contain information related to:

* Users
* Careers
* Skills
* Chapters
* Career-skill mappings
* Skill-chapter mappings
* Resumes
* Skill analyses
* Roadmaps
* Roadmap progress
* Achievements
* Notifications
* Jobs
* Market data
* Feedback
* Audit information

MongoDB is treated as the source of truth for application data.

---

# Job Intelligence

CareerCraft uses an external job-data provider to retrieve current job opportunities.

The backend converts provider responses into a consistent CareerCraft job format.

The job system supports:

* Career-specific searches
* Search queries
* Duplicate removal
* Job pagination
* External application URLs
* Company and location information
* Job categories
* Posted dates
* Salary information when supplied by the provider

The backend does not generate fake job listings.

---

# Notification System

The notification system is connected to the user's active career.

For example:

```text
Active Career:
Data Analyst

        ↓

Career Search Keywords:

Data Analyst
Business Intelligence Analyst

        ↓

External Job Provider

        ↓

Duplicate Removal

        ↓

MongoDB Notifications

        ↓

CareerCraft Notification Page
```

Notifications are stored against the authenticated user's ID.

Each notification can contain:

* Career
* Job title
* Company
* Location
* External job URL
* Read status
* Creation timestamp

Users can mark individual notifications as read or mark all notifications as read.

---

# Installation and Setup

## 1. MongoDB Setup

Install MongoDB locally or create a MongoDB Atlas cluster.

Create a database named:

```text
careercraft
```

Then copy the MongoDB connection string into the backend environment.

For MongoDB Atlas:

1. Create a database user.
2. Give the user appropriate read/write permissions.
3. Configure Atlas Network Access.
4. Add the IP address required by the deployment environment.
5. Add the resulting connection string to `MONGODB_URI`.

---

## 2. Backend Virtual Environment

From the project root:

```bash
python -m venv .venv
```

Activate it:

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### macOS/Linux

```bash
source .venv/bin/activate
```

---

## 3. Install Backend Requirements

```bash
pip install -r backend/requirements.txt
```

---

## 4. Install the spaCy Model

```bash
python -m spacy download en_core_web_sm
```

Resume processing recognizes skills that exist in the CareerCraft skill dataset.

---

## 5. Configure the Backend

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Configure the required values:

```env
MONGODB_URI=mongodb://localhost:27017/careercraft

JWT_SECRET_KEY=use-a-long-random-secret

FLASK_ENV=development

FRONTEND_URL=http://localhost:5173

POWERBI_EMBED_URL=
POWERBI_REPORT_ID=
POWERBI_WORKSPACE_ID=

JOB_DATA_PROVIDER_URL=
JOB_DATA_PROVIDER_ID=
JOB_DATA_PROVIDER_KEY=
```

Never commit `.env` files or backend secrets to GitHub.

---

## 6. Create the First Admin

Run:

```bash
python backend/scripts/create_admin.py
```

The script prompts for administrator details and stores the password as a bcrypt hash.

---

## 7. Import the Excel Dataset

After MongoDB and the backend environment are configured:

```bash
python backend/scripts/import_excel.py path/to/careercraft.xlsx
```

Supported worksheets include:

```text
Careers
Skills
Chapters
CareerSkillMapping
SkillChapterMapping
```

Imports use safe upserts and do not invent missing dataset records.

---

## 8. Start Flask

From the project root:

```bash
python backend/app.py
```

The API is available at:

```text
http://localhost:5000/api
```

Health check:

```text
/api/health
```

For production WSGI hosting:

```bash
gunicorn --chdir backend app:app
```

---

## 9. Configure the Frontend

Copy:

```text
.env.example
```

to:

```text
.env
```

Then configure:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

The frontend uses this value to communicate with the Flask API.

---

## 10. Start React

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Vite development server will normally be available at:

```text
http://localhost:5173
```

---

# Deployment

## Netlify Frontend Deployment

Recommended settings:

```text
Build command:
npm run build

Publish directory:
dist
```

Configure:

```text
VITE_API_BASE_URL
```

in the Netlify environment variables.

The value should point to the deployed Flask API.

Because CareerCraft is a React single-page application, configure a SPA redirect so application routes serve `index.html`.

---

## Python Backend Deployment

Deploy the `backend` directory to a Python-compatible hosting provider.

Production start command:

```bash
gunicorn app:app
```

Configure all backend environment variables through the hosting provider.

Set:

```text
FRONTEND_URL
```

to the deployed frontend origin.

---

# MongoDB Atlas

For production:

```env
MONGODB_URI=<MongoDB Atlas connection string>
```

Important considerations:

* URL-encode special characters in database passwords.
* Create a dedicated database user.
* Configure Atlas Network Access.
* Do not expose database credentials in the React application.
* Keep the MongoDB connection string only in backend environment variables.

---

# Troubleshooting

### Server selection timeout

Check:

* `MONGODB_URI`
* MongoDB credentials
* Atlas Network Access
* Database availability

### spaCy model not found

Run:

```bash
python -m spacy download en_core_web_sm
```

inside the active virtual environment.

### PDF upload fails

Check:

* The file is a PDF.
* The file size is within the configured limit.
* Flask upload configuration is correct.

### Jobs are unavailable

Check:

```env
JOB_DATA_PROVIDER_URL=
JOB_DATA_PROVIDER_ID=
JOB_DATA_PROVIDER_KEY=
```

The backend does not fabricate job records when the external provider is unavailable.

### Notifications are not appearing

Check:

1. The user has an active career.
2. Job-provider credentials are configured.
3. The notification endpoint is accessible.
4. MongoDB contains the `notifications` collection/data.
5. The browser has a valid JWT.
6. The career name matches the supported career keyword mapping.

### Market intelligence is unavailable

Configure the Power BI values or provide administrator-curated market data.

### Admin login fails

Run:

```bash
python backend/scripts/create_admin.py
```

Then verify that the account has the correct administrator role.

### CORS errors

Set:

```env
FRONTEND_URL=http://localhost:5173
```

or the exact deployed frontend origin.

### Resume skills are missing

Ensure the skill:

1. Exists in MongoDB.
2. Is included in the CareerCraft skill dataset.
3. Appears in the extracted resume text.

---

# Project Status

CareerCraft currently includes the core full-stack career intelligence workflow:

* [x] React frontend
* [x] Flask backend
* [x] MongoDB integration
* [x] JWT authentication
* [x] bcrypt password security
* [x] Career selection
* [x] Resume upload
* [x] NLP-based skill extraction
* [x] Skill-gap analysis
* [x] Career recommendations
* [x] Personalized learning roadmap
* [x] Roadmap progress tracking
* [x] Job search
* [x] External job application links
* [x] Career-specific job notifications
* [x] Notification read/unread management
* [x] Dashboard
* [x] Achievement/progress modules
* [x] Market intelligence integration
* [x] Admin functionality

---

# Future Enhancements

Planned improvements may include:

* More comprehensive job-market analytics
* Improved job ranking and relevance scoring
* Additional career domains beyond technology
* Advanced resume analysis
* More detailed ATS analysis
* Expanded learning resources
* Personalized skill recommendations
* Improved market-demand forecasting
* Additional dashboard visualizations
* Production deployment and monitoring
* Automated job-data refresh strategies

---

# Development Philosophy

CareerCraft prioritizes:

* Deterministic and explainable skill matching
* Real external job data
* Secure backend architecture
* MongoDB as the application source of truth
* Personalized career guidance
* Separation between frontend and backend secrets
* Reproducible development and deployment

---

# License

This project is currently developed as an academic/project implementation.

Copyright © 2026 CareerCraft.
