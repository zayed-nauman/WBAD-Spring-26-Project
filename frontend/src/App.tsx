import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './components/Login/Login'
import Signup from './components/Login/Signup'
import Dashboard from './components/Dashboard/Dashboard'
import Returns from './components/Returns/Returns'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Routes with Sidebar */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/returns" element={<Returns />} />
          {/* Add more routes here as needed */}
        </Route>
      </Routes>
    </Router>
  )
}





export default App
