import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SchoolData from './pages/admin/SchoolData';
import GuruManagement from './pages/admin/GuruManagement';
import AdminProfile from './pages/admin/AdminProfile';
import SheetsIntegration from './pages/admin/SheetsIntegration';
import GuruLayout from './pages/guru/GuruLayout';
import GuruDashboard from './pages/guru/GuruDashboard';
import StudentData from './pages/guru/StudentData';
import Attendance from './pages/guru/Attendance';
import Grades from './pages/guru/Grades';
import Journal from './pages/guru/Journal';
import GuruProfile from './pages/guru/GuruProfile';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'admin' | 'guru' }) => {
  const { user, profile, loading } = useAppContext();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user || !profile) {
    // Redirect to the specific login page based on the route's required role
    return <Navigate to={role === 'admin' ? "/login/admin" : "/login/guru"} />;
  }
  
  if (role && profile.role !== role) {
    // If logged in as wrong role, redirect to their home
    return <Navigate to={profile.role === 'admin' ? "/admin" : "/guru"} />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/login/admin" element={<Login role="admin" />} />
          <Route path="/login/guru" element={<Login role="guru" />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="school" element={<SchoolData />} />
            <Route path="guru" element={<GuruManagement />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="sheets" element={<SheetsIntegration />} />
          </Route>

          {/* Guru Routes */}
          <Route path="/guru" element={<ProtectedRoute role="guru"><GuruLayout /></ProtectedRoute>}>
            <Route index element={<GuruDashboard />} />
            <Route path="students" element={<StudentData />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="grades" element={<Grades />} />
            <Route path="journal" element={<Journal />} />
            <Route path="profile" element={<GuruProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
