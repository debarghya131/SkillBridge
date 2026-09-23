import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import LandingPage from './landing/LandingPage'
import ToastViewport from './ui/ToastViewport'
import { getStudentSessionToken } from './student/studentApi'
import { getCompanySessionToken } from './company/companyApi'
import { getAdminSessionToken } from './admin/adminApi'

const StudentAuth = lazy(() => import('./student/StudentAuth'))
const StudentDashboard = lazy(() => import('./student/StudentDashboard'))
const TaskPage = lazy(() => import('./student/task/TaskPage'))
const TrustScoreCriteria = lazy(() => import('./student/TrustScoreCriteria'))
const CompanyAuth = lazy(() => import('./company/CompanyAuth'))
const CompanyDashboard = lazy(() => import('./company/CompanyDashboard'))
const AdminAuth = lazy(() => import('./admin/AdminAuth'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const LoginPortal = lazy(() => import('./auth/LoginPortal'))
const NotFound = lazy(() => import('./ui/NotFound'))

function RouteLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#475569', fontWeight: 700 }}>Loading workspace...</div>
}

function StudentProtectedRoute() {
  const location = useLocation()
  const token = getStudentSessionToken()

  if (!token) {
    return <Navigate to="/student" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function CompanyProtectedRoute() {
  const location = useLocation()
  const token = getCompanySessionToken()

  if (!token) {
    return <Navigate to="/company" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function AdminProtectedRoute() {
  const location = useLocation()
  if (!getAdminSessionToken()) return <Navigate to="/admin" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPortal />} />
          <Route path="/student" element={<StudentAuth />} />
          <Route element={<StudentProtectedRoute />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/task" element={<TaskPage />} />
            <Route path="/student/trustscore-criteria" element={<TrustScoreCriteria />} />
          </Route>
          <Route path="/company" element={<CompanyAuth />} />
          <Route element={<CompanyProtectedRoute />}>
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
          </Route>
          <Route path="/reviewer" element={<Navigate to="/admin" replace />} />
          <Route path="/reviewer/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  )
}
