import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 20, color = 'var(--brand-orange)' }) => {
  return (
    <div 
      className="spinner" 
      style={{ 
        width: size, 
        height: size, 
        borderTopColor: color 
      }}
    />
  );
};

export default Spinner;
