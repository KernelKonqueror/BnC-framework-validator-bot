# BNC Framework Validator Bot

**Live App:** [https://bnc-framework-validator-bot.onrender.com/](https://bnc-framework-validator-bot.onrender.com/)

Framework Validator Bot is an AI-powered assistant designed for management consulting aspirants to practice their case interviewing frameworks. It uses Google's **Gemini AI** to evaluate user-submitted frameworks against specific case rubrics, providing instant feedback, MECE (Mutually Exclusive, Collectively Exhaustive) checks, and letter grades.

## Features

- **AI Evaluation**: Powered by Gemini 1.5 Flash (or 2.0/2.5) for high-quality consulting-style feedback.
- **MECE Check**: Automatically analyzes if your framework buckets are logical and cover the entire problem space.
- **Rubric-Based Grading**: Cases include "hidden" rubrics that the AI uses to check for specific required elements (e.g., focusing on costs when revenues are stable).
- **History Tracking**: Sign in with Google to save your evaluation history to Firebase.
- **Dark/Light Mode**: Toggle between themes for a comfortable practice environment.
- **Customizable Cases**: Easily add or modify cases and rubrics via a simple JSON file.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express + Node.js (proxies AI requests to keep keys safe)
- **AI**: Google Gemini API (@google/genai)
- **Database/Auth**: Firebase Firestore & Firebase Authentication
- **Icons**: Lucide React
- **Build Tool**: Vite

## Customizing Cases

You can update the learning material and grading behavior by editing `/src/data/cases.json`.

```json
[
  {
    "text": "The case prompt description goes here.",
    "rubric": "Instructions for the AI on what to look for, specific penalties, or required buckets."
  }
]
```

## Building for Production

To build the application for deployment (e.g., on Render, Netlify, or Vercel):

```bash
npm run build
npm start
```

## License

MIT License - Feel free to use and adapt this for your own practice!
