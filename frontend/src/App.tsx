import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom'
import Login from './components/Login/Login'
import Signup from './components/Login/Signup'
import ResetPassword from './components/Login/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'
import Spinner from './components/Common/Spinner'

const Returns = lazy(() => import('./components/Returns/Returns'))
const OrdersDashboard = lazy(() => import('./features/orders/pages/OrdersDashboard'))
const CreateOrder = lazy(() => import('./features/orders/pages/CreateOrder'))
const ModifyOrder = lazy(() => import('./features/orders/pages/ModifyOrder'))
const UpdateOrderStatus = lazy(() => import('./features/orders/pages/UpdateOrderStatus'))
const LabelPreview = lazy(() => import('./features/orders/pages/LabelPreview'))
const BlacklistedNumbers = lazy(() => import('./features/orders/pages/BlacklistedNumbers'))
const RiderOrdersPage = lazy(() => import('./features/riders/pages/RiderOrdersPage'))
const AssignRiderPage = lazy(() => import('./features/riders/pages/AssignRiderPage'))
const ConfirmAssignmentPage = lazy(() => import('./features/riders/pages/ConfirmAssignmentPage'))
const AssignmentSuccessPage = lazy(() => import('./features/riders/pages/AssignmentSuccessPage'))
const RiderPoolPage = lazy(() => import('./features/riders/pages/RiderPoolPage'))
const RiderFormPage = lazy(() => import('./features/riders/pages/RiderFormPage'))
const OrderAssignmentsPage = lazy(() => import('./features/riders/pages/OrderAssignmentsPage'))

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="page-container"><Spinner size={40} /></div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ResetPassword />} />
          
          {/* Protected Routes with Sidebar */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersDashboard />} />
            <Route path="/orders/new" element={<CreateOrder />} />
            <Route path="/orders/:id/edit" element={<ModifyOrder />} />
            <Route path="/orders/:id/status" element={<UpdateOrderStatus />} />
            <Route path="/orders/:id/label" element={<LabelPreview />} />
            <Route path="/blacklist" element={<BlacklistedNumbers />} />
            <Route path="/returns" element={<Returns />} />

            <Route path="/riders" element={<RiderOrdersPage />} />
            <Route path="/riders/assign/:orderId" element={<AssignRiderPage />} />
            <Route path="/riders/confirm/:orderId/:riderId" element={<ConfirmAssignmentPage />} />
            <Route path="/riders/success/:orderId" element={<AssignmentSuccessPage />} />
            <Route path="/rider-pool" element={<RiderPoolPage />} />
            <Route path="/rider-pool/new" element={<RiderFormPage mode="create" />} />
            <Route path="/rider-pool/:id/edit" element={<RiderFormPage mode="edit" />} />
            <Route path="/order-assignments" element={<OrderAssignmentsPage />} />
            <Route path="/order-assignments/:id/status" element={<UpdateOrderStatus />} />
            {/* Add more routes here as needed */}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}





export default App
