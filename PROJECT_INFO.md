# Nexus - LSCG Tillman AI Assistant Project Info

This document serves as the "memory point" for the technical architecture and business rules of the Nexus project. It should be updated whenever significant changes are made.

## Overview
Nexus is a voice-enabled AI assistant designed for Tillman Fiber and Lightspeed Construction Group. It provides real-time answers about project status, construction procedures, rate cards, and utility locate tickets.

## Tech Stack
*   **Frontend**: React (v18+), TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **AI Engine**: Google Gemini API (`gemini-2.5-flash`) via `@google/genai` SDK
*   **Data Processing**: SheetJS (`xlsx`) for client-side Excel parsing
*   **Visualization**: Recharts for analytics
*   **Speech**: Web Speech API (`webkitSpeechRecognition`, `speechSynthesis`)

## Data Sources & Business Rules
The application fetches data directly from GitHub-hosted Excel files.

### 1. Project Data (`tillman-project.xlsx`)
*   **Source**: Fetched on load and refreshed every 5 minutes.
*   **Key Fields**:
    *   `NTP Number`: Unique project identifier.
    *   `Footage Remaining`: **Primary source for footage math.**
    *   `Footage UG`: Fallback source for footage if 'Footage Remaining' is empty.
*   **Math Logic**:
    *   The AI context is fed pre-calculated totals for supervisors to prevent hallucination.
    *   Footage parsing logic strictly removes non-numeric characters (except decimals) before summing.

### 2. Locate Tickets (`locate-tickets.xlsx`)
*   **Source**: Fetched on load.
*   **Parsing Logic**:
    *   Maps to projects via NTP/Map/Job Number.
    *   **Ticket Number Detection**: Scans for columns containing "ticket" or "locate" (excluding dates/status).
    *   **Strict Rule**: Footage data found in this file is **IGNORED** to prevent conflicts with the Project Excel file.
*   **Display Format**:
    *   Must list explicit ticket numbers (e.g., `324501377`).

## Evolution Log

### Initial Build
*   Basic React app with Gemini integration.
*   Added PDF/Text knowledge base processing.

### Update: Locate Ticket & Math Fixes
*   **Issue**: AI was calculating wrong footage totals and missing ticket numbers.
*   **Fixes**:
    *   Implemented `parseFootage` helper to sanitize numerical inputs.
    *   Prioritized `Footage Remaining` column over `Footage UG`.
    *   Explicitly removed `footage` property from parsed locate tickets to force AI to use Project data.
    *   Widened column detection logic for Locate Ticket numbers to ensure they appear in the prompt context.
    *   Updated System Instruction to enforce listing specific ticket numbers.

### Update: Spanish Language Support (Current)
*   **Features**:
    *   Added **EN | ES** toggle in the header.
    *   **System Instruction**: Dynamically injects instructions for the AI to translate responses into Spanish while preserving technical data structure (NTPs, ticket numbers).
    *   **Speech-to-Text**: Updates `recognition.lang` to `es-MX` when Spanish is selected.
    *   **Text-to-Speech**: Auto-switches to a Spanish voice for reading responses aloud.

## Maintenance Notes
*   **API Key**: Injected via `process.env.API_KEY` (handled via `index.html` for GitHub Pages).
*   **Deployment**: Static hosting (GitHub Pages compatible).