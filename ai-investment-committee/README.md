
# AI Investment Committee

A production-grade, multi-agent investment research platform powered by LangChain, LangGraph, React, TailwindCSS, and Node.js/Express.

## Project Structure

```
ai-investment-committee/
├── client/                 # React Frontend (Vite, TailwindCSS, React Router, Axios)
│   ├── src/
│   │   ├── api/            # API clients & configuration
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page views (Home, Dashboard, etc.)
│   │   ├── layouts/        # Layout wrappers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # Client-side business logic / API services
│   │   ├── utils/          # Frontend utility functions
│   │   ├── context/        # React context providers
│   │   ├── assets/         # Static assets (images, icons)
│   │   ├── App.jsx         # App routing & main wrapper
│   │   └── main.jsx        # App entry point
│   ├── .env                # Client environment variables
│   └── package.json
│
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── config/         # Server configuration files
│   │   ├── controllers/    # Express controllers
│   │   ├── routes/         # Express routes (health, agents, etc.)
│   │   ├── middleware/     # Custom Express middleware
│   │   ├── services/       # Backend business logic services
│   │   ├── agents/         # LangChain investment agents
│   │   │   ├── researchAgent.js
│   │   │   ├── riskAgent.js
│   │   │   ├── marketAgent.js
│   │   │   ├── devilAdvocateAgent.js
│   │   │   └── committeeAgent.js
│   │   ├── graph/          # LangGraph state machine & workflow graphs
│   │   │   └── investmentGraph.js
│   │   ├── prompts/        # Prompt templates for agents
│   │   ├── utils/          # Backend utility functions
│   │   ├── app.js          # Express app configuration
│   │   └── server.js       # Express server entry point
│   ├── .env                # Server environment variables
│   └── package.json
│
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Setup & Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd ai-investment-committee
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Running the Project

#### Run Backend Server (Express)

From the `server` directory:
```bash
# Run in development mode (with nodemon)
npm run dev

# Run in production mode
npm start
```
The server will run on `http://localhost:5000` (or specified PORT in `server/.env`).

#### Run Frontend Client (Vite)

From the `client` directory:
```bash
# Run in development mode
npm run dev
```
The client will run on `http://localhost:5173`.
=


