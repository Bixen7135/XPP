import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { PageLoader } from './components/common/PageLoader';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TaskCompletion } from './components/TaskCompletion';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { Profile } from './components/auth/Profile';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useToast, ToastComponent } from './components/Toast';
import { SheetsLibrary } from './components/SheetsLibrary';
import { SheetView } from './components/SheetView';
import { SheetEdit } from './components/SheetEdit';
import { Settings } from './components/auth/Settings';
import { Statistics } from './components/auth/Statistics';
import { Footer } from './components/common/Footer';

// Lazy load components
const ExamTypeSelector = lazy(() => import('./components/ExamTypeSelector').then(module => ({
  default: module.ExamTypeSelector
})));

const ExamForm = lazy(() => import('./components/ExamForm'));

const TaskForm = lazy(() => import('./components/TaskForm').then(module => ({
  default: module.TaskForm
})));

const TaskLibrary = lazy(() => import('./components/TaskLibrary').then(module => ({
  default: module.TaskLibrary
})));

const TaskPreview = lazy(() => import('./components/TaskPreview').then(module => ({
  default: module.TaskPreview
})));

const ExamPreview = lazy(() => import('./components/ExamPreview').then(module => ({
  default: module.ExamPreview
})));

function App() {
  const { ToastComponent } = useToast();
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navigation />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <main className="container mx-auto px-4 py-8 flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/generate-exam" element={
                  <ProtectedRoute>
                    <ExamTypeSelector />
                  </ProtectedRoute>
                } />
                <Route path="/generate-exam/:type" element={
                  <ProtectedRoute>
                    <ExamForm />
                  </ProtectedRoute>
                } />
                <Route path="/generate-task" element={
                  <ProtectedRoute>
                    <TaskForm />
                  </ProtectedRoute>
                } />
                <Route path="/exam-preview" element={
                  <ProtectedRoute>
                    <ExamPreview />
                  </ProtectedRoute>
                } />
                <Route path="/task-preview" element={
                  <ProtectedRoute>
                    <TaskPreview />
                  </ProtectedRoute>
                } />
                <Route path="/library" element={
                  <ProtectedRoute>
                    <TaskLibrary />
                  </ProtectedRoute>
                } />
                <Route path="/task-completion" element={<TaskCompletion />} />
                <Route path="/sheets" element={
                  <ProtectedRoute>
                    <SheetsLibrary />
                  </ProtectedRoute>
                } />
                <Route path="/sheets/:id" element={
                  <ProtectedRoute>
                    <SheetView />
                  </ProtectedRoute>
                } />
                <Route path="/sheets/:id/edit" element={
                  <ProtectedRoute>
                    <SheetEdit />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/statistics" element={
                  <ProtectedRoute>
                    <Statistics />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
          </Suspense>
        </ErrorBoundary>
        <Footer />
        <ToastComponent />
      </div>
    </BrowserRouter>
  );
}

export default App;