import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import Dashboard from './pages/Dashboard';
import UploadTest from './pages/UploadTest';
import TestAnalysis from './pages/TestAnalysis';
import SubjectAnalysis from './pages/SubjectAnalysis';
import ChapterAnalysis from './pages/ChapterAnalysis';
import WeakTopics from './pages/WeakTopics';
import TimeManagement from './pages/TimeManagement';
import TestComparison from './pages/TestComparison';
import TargetPredictor from './pages/TargetPredictor';
import StudyPlanner from './pages/StudyPlanner';
import TestHistory from './pages/TestHistory';
import ProfileSettings from './pages/ProfileSettings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Application Layout & 12 Pages */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<UploadTest />} />
            <Route path="test-analysis" element={<TestAnalysis />} />
            <Route path="subjects" element={<SubjectAnalysis />} />
            <Route path="chapters" element={<ChapterAnalysis />} />
            <Route path="weak-topics" element={<WeakTopics />} />
            <Route path="time-management" element={<TimeManagement />} />
            <Route path="compare" element={<TestComparison />} />
            <Route path="target-predictor" element={<TargetPredictor />} />
            <Route path="study-planner" element={<StudyPlanner />} />
            <Route path="history" element={<TestHistory />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
