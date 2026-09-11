import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import LandingPage from './landingpage/LandingPage'
import ToastViewport from './ui/ToastViewport'
import { getStudentSessionToken } from './student/studentApi'
import { getCompanySessionToken } from './company/companyApi'
import { getReviewerSessionToken } from './reviewer/reviewerApi'

const StudentAuth = lazy(() => import('./student/studentAuth'))
const StudentDashboard = lazy(() => import('./student/student'))
const Taskpage = lazy(() => import('./student/task/Taskpage'))
const TrustScoreCriteria = lazy(() => import('./student/trustscoreCriteria'))
const CompanyAuth = lazy(() => import('./company/companyAuth'))
const CompanyDashboard = lazy(() => import('./company/company'))
const ReviewerAuth = lazy(() => import('./reviewer/ReviewerAuth'))
const ReviewerDashboard = lazy(() => import('./reviewer/ReviewerDashboard'))
const LoginPortal = lazy(() => import('./auth/LoginPortal'))

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

function ReviewerProtectedRoute() {
  const location = useLocation()
  if (!getReviewerSessionToken()) return <Navigate to="/reviewer" replace state={{ from: location.pathname }} />
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
            <Route path="/student/task" element={<Taskpage />} />
            <Route path="/student/trustscore-criteria" element={<TrustScoreCriteria />} />
          </Route>
          <Route path="/company" element={<CompanyAuth />} />
          <Route element={<CompanyProtectedRoute />}>
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
          </Route>
          <Route path="/reviewer" element={<ReviewerAuth />} />
          <Route element={<ReviewerProtectedRoute />}>
            <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastViewport />
    </>
  )
}
