# JustiFi React Application

Modern React conversion of the JustiFi educational platform with Firebase integration.

## ✨ Features

- **Multi-role authentication** (Student, Teacher, Developer)
- **Role-based dashboards** with personalized views
- **Real-time Firebase integration** for user data and announcements
- **Session timeout management** with inactivity warnings
- **Responsive design** that works on all devices
- **Smooth animations** using Framer Motion
- **Organized component structure** for easy maintenance

## 📁 Project Structure

```
src/
├── assets/
│   └── styles/          # All CSS files organized by feature
├── components/          # Reusable React components
├── contexts/            # React Context for global state (Auth)
├── hooks/               # Custom hooks (useAuth, useSessionTimeout)
├── pages/               # Page components for routes
├── services/            # Firebase and external services
├── utils/               # Utility functions
├── App.jsx              # Main app with routing
└── main.jsx             # React entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Create a `.env.local` file in the root directory with your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   Or add `window.JUSTIFI_FIREBASE_CONFIG` object to your HTML before the script tag.

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 📚 Key Components

### Authentication
- `AuthContext` - Global auth state management
- `useAuth()` - Hook to access auth in any component
- `PrivateRoute` - Component to protect routes by role

### Pages
- **LandingPage** - Public landing page with parallax
- **LoginPage** - Auth page (login & register)
- **StudentDashboard** - Student home with progress
- **StudentProfile** - Student profile management
- **AdminDashboard** - Teacher dashboard
- **AdminStudents** - Teacher's student management
- **DeveloperDashboard** - System overview
- **DeveloperUsers** - User management interface
- **DeveloperRoles** - Role assignment interface

## 🎨 Styling

All CSS files are organized in `src/assets/styles/`:
- `index.css` - Global styles and CSS variables
- `navbar.css` - Navigation styles
- `sidebar.css` - Sidebar navigation
- `dashboard.css` - Dashboard layouts
- `style.css` - Landing page animations
- `auth.css` - Authentication forms
- `profile.css` - Profile pages
- `session-warning.css` - Session timeout modal

## 🔐 Security Features

- Firebase Authentication
- Role-based access control
- Session timeout with activity tracking
- Protected routes by user role
- Secure profile data management

## 📦 Dependencies

- **react** - UI framework
- **react-router-dom** - Client-side routing
- **firebase** - Backend services (Auth, Firestore, Storage)
- **framer-motion** - Animations
- **react-hook-form** - Form state management
- **vite** - Fast build tool

## 🛠️ Development

### Adding a New Page
1. Create file in `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. Create corresponding CSS in `src/assets/styles/`

### Adding a New Component
1. Create file in `src/components/MyComponent.jsx`
2. Import CSS from `src/assets/styles/`
3. Use in your pages or other components

## 📝 Firebase Collections

- **users** - User profiles and account data
- **publicAnnouncements** - System-wide announcements
- **announcements** - User-specific announcements

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

The optimized build will be in the `dist/` folder.

### Deploy to Vercel / Netlify
```bash
# Vercel
vercel

# Netlify
netlify deploy --prod --dir=dist
```

## 📄 License

© 2024 JustiFi. All rights reserved.

## 🤝 Contributing

When modifying the app:
1. Keep components focused and reusable
2. Place styles in appropriate CSS file
3. Use CSS variables for consistency
4. Test on mobile and desktop

## 📞 Support

For issues or questions, check the original source code or Firebase documentation.
