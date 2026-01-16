# InuaBreath - Project Summary

## Overview

**InuaBreath** is a mobile application designed for nervous system regulation through AI-powered breathing exercises. The app analyzes user emotional states and provides personalized breathing interventions to help manage stress, anxiety, and improve overall well-being.

## Architecture

### System Architecture

The project follows a **client-server architecture** with two main components:

1. **Frontend (Mobile App)**: React Native application built with Expo
2. **Backend (AI Service)**: FastAPI server with local LLM integration

### Technology Stack

#### Frontend
- **Framework**: React Native with Expo (~54.0.30)
- **Routing**: Expo Router (file-based routing)
- **State Management**: React Hooks (useState, useEffect, custom hooks)
- **UI Libraries**:
  - `expo-linear-gradient` - Gradient backgrounds
  - `expo-blur` - Glassmorphism effects
  - `react-native-reanimated` - Smooth animations
  - `expo-haptics` - Tactile feedback
  - `@expo/vector-icons` - Icon system
- **Networking**: Axios for API communication
- **Voice Recognition**: `@react-native-voice/voice` (development builds only)

#### Backend
- **Framework**: FastAPI (Python)
- **AI/LLM**: LangChain with local LLM via LM Studio
- **Model**: OpenAI-compatible local model (gpt-oss-20b)
- **Output Parsing**: Pydantic models for structured JSON responses

### Project Structure

```
InuaBreath/
├── app/                          # Frontend (React Native/Expo)
│   ├── app/                      # Expo Router pages
│   │   ├── (tabs)/               # Tab navigation group
│   │   │   ├── index.tsx         # Main home screen
│   │   │   └── explore.tsx       # Explore screen
│   │   ├── (onboarding)/         # Onboarding flow
│   │   ├── voice-mood.tsx        # Voice input screen
│   │   └── _layout.tsx           # Root layout
│   ├── components/               # Reusable UI components
│   │   ├── ChatInput.tsx         # Text input with mic button
│   │   ├── TopBar.tsx            # Header component
│   │   └── ui/                   # UI primitives
│   ├── src/                      # Core application logic
│   │   ├── components/
│   │   │   └── BreathingOrb.tsx  # Animated breathing orb
│   │   ├── hooks/
│   │   │   └── useBreathing.ts   # Breathing exercise state management
│   │   ├── services/
│   │   │   └── api.ts            # API client
│   │   └── constants/            # Configuration and strings
│   ├── constants/                # Theme constants
│   └── hooks/                    # Global hooks
│
└── brain/                        # Backend (Python/FastAPI)
    └── main.py                   # FastAPI server with LLM integration
```

## Core Features

### 1. AI-Powered Emotional Analysis
- Users can input text messages describing their emotional state
- The backend AI analyzes the input and determines:
  - Nervous system load level
  - Appropriate breathing intervention
  - Safety flags for emergency situations

### 2. Breathing Exercises
The app supports multiple breathing techniques:
- **Physiological Sigh** (2-1-4-0): For acute stress
- **Box Breathing** (4-4-4-4): For anxiety
- **4-7-8 Breathing** (4-7-8-0): For sleep preparation
- **Relax Breathing**: General relaxation

### 3. Visual Breathing Guide
- **BreathingOrb Component**: Animated orb that expands/contracts following the breathing pattern
- Real-time visual feedback synchronized with breathing phases
- Haptic feedback at key transition points
- Glow effects and smooth animations using Reanimated

### 4. Circadian Rhythm Awareness
- Automatic day/night mode based on time of day (20:00 - 06:00 = night mode)
- Different color themes and gradients for day/night
- Context-aware AI responses

### 5. Voice Input (Optional)
- Voice-to-text input for hands-free interaction
- Local mood analysis using keyword matching
- Privacy-focused: voice processing stays on-device
- Requires development build (not available in Expo Go)

### 6. Safety Protocol
- AI detects potential emergency situations
- Safety flag triggers emergency UI
- Direct emergency call button (112)
- Professional help recommendations

## Data Flow

### Main Interaction Flow

1. **User Input** → Text or voice input describing emotional state
2. **API Request** → Frontend sends message + context (day/night) + HR data to backend
3. **AI Analysis** → Backend LLM analyzes input and generates structured response:
   ```json
   {
     "analysis": "Analysis text",
     "intervention": {
       "title": "Box Breathing",
       "pattern": [4, 4, 4, 4],
       "duration_seconds": 60,
       "animation_type": "box"
     },
     "safety_flag": false
   }
   ```
4. **UI Update** → Frontend displays analysis and starts breathing exercise
5. **Breathing Animation** → BreathingOrb animates according to pattern
6. **User Control** → Pause, resume, or reset controls available

## Key Components

### BreathingOrb Component
- Uses `react-native-reanimated` for smooth animations
- Scales from 1x to 3x during inhale
- Opacity and glow effects synchronized with breathing phases
- Haptic feedback at inhale start, hold, and exhale
- Supports pause/resume functionality

### useBreathing Hook
- Manages breathing exercise state
- Handles pattern storage
- Controls play/pause/reset states
- Provides current instruction text

### API Service
- Centralized API client using Axios
- Type-safe request/response interfaces
- Error handling with user-friendly messages
- Configurable API URL (currently local network IP)

## Platform-Specific Features

### Android
- Custom navigation bar styling (black background)
- MIUI-specific keyboard handling fixes
- Edge-to-edge display support
- Manual keyboard lift workarounds for certain devices

### iOS
- Native keyboard avoidance with KeyboardAvoidingView
- Smooth scroll-to-input behavior
- Focus restoration after app backgrounding

## Design Philosophy

### UI/UX
- **Glassmorphism**: Translucent cards with blur effects
- **Gradient Backgrounds**: Dynamic gradients that change with time of day
- **Minimalist Interface**: Focus on the breathing orb and essential controls
- **Dark Theme**: Optimized for low-light usage
- **Haptic Feedback**: Tactile responses for better engagement

### Privacy & Security
- Voice processing stays on-device
- Local LLM processing (no cloud API calls)
- No user data storage
- Emergency protocols for safety

## Development Setup

### Frontend
```bash
cd app
npm install
npx expo start
```

### Backend
```bash
cd brain
# Activate virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Prerequisites
- Node.js and npm
- Python 3.x
- LM Studio (for local LLM)
- Expo CLI
- Android Studio / Xcode (for native builds)

## Configuration

### API Endpoint
Configured in `app/src/constants/config.ts`:
- Default: `http://192.168.1.9:8000/analyze-load`
- Must match local network IP of backend server

### LLM Configuration
Configured in `brain/main.py`:
- LM Studio endpoint: `http://localhost:1234/v1`
- Model: `openai/gpt-oss-20b`
- Temperature: 0.0 (for consistent responses)

## Current Limitations

1. **Voice Input**: Requires development build, not available in Expo Go
2. **Network Dependency**: Backend must be running on local network
3. **Local LLM Required**: Needs LM Studio with compatible model
4. **Platform-Specific Bugs**: Some Android MIUI devices require workarounds

## Future Enhancements (Potential)

- Offline mode with on-device AI
- Heart rate integration via wearable devices
- Progress tracking and history
- Multiple language support
- Cloud backend option
- Social features (sharing, community)

## Technical Highlights

- **Type Safety**: Full TypeScript implementation
- **Performance**: Optimized animations using Reanimated worklets
- **Accessibility**: Safe area handling, keyboard avoidance
- **Error Handling**: Comprehensive error states and user feedback
- **Code Organization**: Modular architecture with clear separation of concerns

---

**Project Status**: Active Development
**Primary Use Case**: Personal mental wellness and stress management
**Target Platforms**: iOS, Android (Web support available but not primary)
