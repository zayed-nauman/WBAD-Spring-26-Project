import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Truck, PhoneOff, RotateCcw } from 'lucide-react';

import './Sidebar.css';
import logoWhite from '../../assets/logo-white.png';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'User Name';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo-container">
        <img src={logoWhite} alt="ZigZag Delivery" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList size={20} />
          <span>Orders</span>
        </NavLink>
        <NavLink to="/riders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={20} />
          <span>Riders</span>
        </NavLink>
        <NavLink to="/blacklist" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PhoneOff size={20} />
          <span>Blacklisted Numbers</span>
        </NavLink>
        <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <RotateCcw size={20} />
          <span>Process Returns</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {getInitials(userName)}
          </div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <button onClick={handleLogout} className="sidebar-logout">
              Log Out
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;
