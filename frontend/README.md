# Muchas Radio Frontend

React TypeScript PWA frontend for Muchas Radio.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_URL` - Backend API URL (default: http://localhost:8080)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:8080)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## PWA Features

This app is a Progressive Web App with:
- Offline support via Service Worker
- Installable on mobile and desktop
- Responsive design

### Icons

The app includes placeholder SVG icons in `public/icons/`. For production, replace these with proper PNG icons:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

You can generate these using tools like:
- https://realfavicongenerator.net/
- https://favicon.io/

## Tech Stack

- **Vite** - Build tool
- **React** - UI framework
- **TypeScript** - Type safety
- **React Query** - Data fetching and state management
- **Axios** - HTTP client
- **Vite PWA Plugin** - Progressive Web App support
