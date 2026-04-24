import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import logo from '../../assets/logo.png';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card">
        <img src={logo} alt="ZigZag Logo" className="dashboard-logo" />
        <h1>Welcome to ZigZag!</h1>
        <p className="success-message">Logged in successfully</p>
        <div className="placeholder-content">
          <p>Your dashboard is ready for development.</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </div>
  );
};


export default Dashboard;
