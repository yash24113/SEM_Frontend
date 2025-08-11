import React from 'react';
import { Link } from 'react-router-dom';

function AuthNav() {
  return (
    <nav style={{ marginBottom: 20 }}>
      <Link to="/login" style={{ marginRight: 10 }}>Login</Link>
      <Link to="/register">Register</Link>
    </nav>
  );
}

export default AuthNav;
