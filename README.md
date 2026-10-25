# 🥗 FoodPlate — Smart AI Food & Nutrition Tracker

> A modern full-stack AI-powered nutrition tracker with real-time camera scanning, Gemini multi-modal meal breakdown, daily health metrics, date-wise history, and meal photo logs.

---

## ✨ Features

- 📸 **Ultra-Fast AI Food Scanner**: Snap photos using your webcam/camera or upload meal images. Uses client-side auto-downscaling and Google Gemini 2.5 Flash for high-speed, sub-3-second nutritional breakdown.
- 🎯 **Daily Target vs. Consumed Comparison**: Live dashboard comparing calories, protein, carbs, fats, fiber, and micronutrients against personalized daily targets.
- 📅 **Interactive Date-Wise History**: Browse past days, filter by date, and view actual meal logs and photo thumbnails uploaded on that date.
- 🩺 **Personalized Health & Nutrition Matrix**: Guided onboarding popup for Height, Weight, Activity Level, Dietary Restrictions, and Calorie targets.
- 🔐 **Multi-User Authentication**: Individual user accounts with easy registration, session persistence, and private data isolation.
- ⚡ **Full-Stack Architecture**: Built with Vite + React 18, Tailwind CSS, Express.js REST API, Sequelize ORM, and Google Gemini AI.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios, Canvas API
- **Backend**: Node.js, Express.js, Sequelize ORM, SQLite
- **AI Engine**: Google Gemini API (`@google/genai`, `gemini-2.5-flash`)
- **Authentication**: JWT token-based auth with bcrypt password hashing

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Google Gemini API Key ([Get one here](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and insert your Gemini API Key:
```env
PORT=5000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=super_secret_jwt_key_here
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

Start the backend:
```bash
npm run dev
# Server running at http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

Open `http://localhost:3000` in your browser.

---

## 🤝 Collaboration & Dual-Sync Setup

This repository is mirrored and synchronized across both developer accounts:
- [`pillisaimedhas-dev/food-and-nutrition-finder`](https://github.com/pillisaimedhas-dev/food-and-nutrition-finder)
- [`crazynani1432/food-and-nutrition-finder`](https://github.com/crazynani1432/food-and-nutrition-finder)

To push changes to both remotes simultaneously:
```bash
git remote set-url --add --push origin https://github.com/pillisaimedhas-dev/food-and-nutrition-finder.git
git remote set-url --add --push origin https://github.com/crazynani1432/food-and-nutrition-finder.git

# A single push now updates both accounts:
git push origin main
```

---

## 📜 License
MIT License. Free to use and build upon.
