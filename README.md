# 🏠 RoomScan – AI-Powered Appliance Detection & Electricity Bill Estimator

RoomScan is a web application that uses **Google Gemini Vision** to analyze room images, identify electrical appliances, estimate their power consumption, and calculate an estimated monthly electricity bill. Instead of manually creating an appliance inventory, users simply upload room photos and receive an AI-generated inventory that can be reviewed and edited before calculating energy usage.

---

## 🚀 Demo

**Live Demo:** https://<your-demo-url>

**Video Demo:** https://<your-video-url>

---

## 📸 Features

- Upload up to 3 room images
- AI-powered appliance detection using Gemini Vision
- Automatic wattage estimation
- Editable appliance inventory
- Monthly electricity bill estimation
- Custom electricity tariff support
- Appliance-wise energy breakdown
- CSV export
- Local auto-save
- Responsive web interface

---

# 🛠️ Tech Stack

## Frontend

- Next.js 14
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js API Routes
- Google Gemini API
- Node.js

## AI

- Google Gemini 2.5 Flash / Gemini Vision
- Prompt Engineering
- Multimodal Image Understanding

---

# 🏗️ Project Architecture

```
Room Images
      │
      ▼
Image Optimization
      │
      ▼
Gemini Vision API
      │
      ▼
Appliance Detection
      │
      ▼
Editable Inventory
      │
      ▼
Energy Consumption
      │
      ▼
Electricity Bill Estimation
```

---

# ⚙️ Installation

## Prerequisites

- Node.js 20+
- npm or pnpm
- Google Gemini API Key

---

## Clone

```bash
git clone https://github.com/<username>/RoomScan.git

cd RoomScan
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment

Create a `.env.local` file.

```env
GEMINI_API_KEY=YOUR_API_KEY
```

---

## Run

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# 🧪 How Judges Can Test

### Option 1 (Recommended)

Use the deployed application:

> https://<your-demo-url>

No installation required.

---

### Option 2

Run locally.

1. Clone repository
2. Install dependencies
3. Add Gemini API Key
4. Run

```bash
npm run dev
```

Upload the provided sample room images located in:

```
/sample-images
```

---

# 📂 Project Structure

```
app/
components/
lib/
public/
sample-images/
styles/
```

---

# 🤖 How We Collaborated with Codex

Codex played a significant role throughout the development process, acting as an AI pair programmer that accelerated implementation while leaving final engineering decisions to our team.

### Where Codex Accelerated Development

During the project, Codex helped us:

- Scaffold the Next.js application structure
- Generate reusable React components
- Build API routes for Gemini integration
- Refactor TypeScript interfaces
- Improve error handling
- Optimize image upload workflows
- Debug runtime issues
- Improve code organization
- Generate utility functions
- Suggest better project architecture

Instead of spending hours writing repetitive boilerplate, we were able to focus on product development and user experience.

---

## Engineering Decisions We Made

Although Codex accelerated development, several important decisions were made manually:

- Designing the overall user workflow
- Choosing Gemini Vision as the AI engine
- Creating the editable appliance inventory instead of relying solely on AI predictions
- Building the electricity estimation logic
- Supporting customizable electricity tariffs
- Designing the responsive user interface
- Deciding on CSV export and local persistence
- Implementing secure server-side API handling

These decisions ensured that RoomScan solved a practical real-world problem rather than serving as only an AI demonstration.

---

## How GPT-5.6 Contributed

GPT-5.6 served as our technical collaborator throughout the project by helping us:

- Brainstorm product ideas
- Improve prompt engineering for appliance detection
- Explain API behavior
- Optimize project architecture
- Improve UX copy
- Refine energy calculation logic
- Review code quality
- Generate technical documentation
- Create the Devpost submission
- Write the project story and README

GPT-5.6 also helped us evaluate alternative implementation approaches before coding them, reducing development time and improving overall quality.

---

## Final Outcome

The combination of human decision-making, Codex-assisted development, and GPT-5.6 guidance enabled us to build a polished full-stack AI application in significantly less time while maintaining clean architecture and a strong user experience.

Codex handled repetitive engineering tasks, GPT-5.6 provided design and implementation guidance, and we made the final product, engineering, and UX decisions.

---

# 💡 Challenges

- Reliable appliance recognition
- Different room lighting conditions
- Prompt engineering
- Image optimization
- Secure API integration
- Balancing speed with AI accuracy

---

# 📚 What We Learned

- Building production-ready AI applications
- Working with multimodal LLMs
- Prompt engineering
- Next.js App Router
- TypeScript best practices
- Image preprocessing
- Secure API architecture
- Designing AI-assisted user experiences

---

# 🔮 Future Work

- Multi-room scanning
- Cloud synchronization
- Smart meter integration
- IoT device support
- Historical analytics
- Energy-saving recommendations
- Improved AI confidence scoring
- Mobile application

---

# 🌐 Supported Platforms

- Chrome
- Edge
- Firefox
- Safari

Desktop and Mobile browsers are fully supported.

---

# 📦 Dependencies

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Gemini API

---

# 🏆 Codex Session Feedback

**Codex Session ID**

```
/feedback <PASTE_YOUR_CODEX_SESSION_ID_HERE>
```

Replace the placeholder above with the **Codex Session ID** from the project thread where the majority of RoomScan's core functionality was developed.

---

# 👥 Team

Built with ❤️ using Google Gemini, GPT-5.6, Codex, Next.js, React, and TypeScript.
