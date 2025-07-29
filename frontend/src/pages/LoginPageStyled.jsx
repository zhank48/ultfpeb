import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoginLogo } from '../components/BrandLogo.jsx';

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app/dashboard';

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(formData);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '3rem 1rem',
      fontFamily: 'PT Sans, ui-sans-serif, system-ui, -apple-system, sans-serif'
    },
    card: {
      maxWidth: '400px',
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      padding: '2rem',
      border: '1px solid #e2e8f0'
    },    logo: {
      width: 'auto',
      height: 'auto',
      backgroundColor: 'transparent',
      borderRadius: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
      fontSize: '2rem',
      color: 'white'
    },
    title: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '0.875rem',
      textAlign: 'center',
      color: '#64748b',
      marginBottom: '2rem'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    inputFocus: {
      borderColor: '#475569',
      boxShadow: '0 0 0 3px rgba(71, 85, 105, 0.1)'
    },
    button: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#475569',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginTop: '1rem'
    },
    buttonHover: {
      backgroundColor: '#334155'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    error: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '0.75rem',
      borderRadius: '6px',
      fontSize: '0.875rem',
      marginBottom: '1rem'
    },
    passwordContainer: {
      position: 'relative'
    },
    eyeButton: {
      position: 'absolute',
      right: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#9ca3af'
    }
  };
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <LoginLogo />
        </div>
        <p style={styles.subtitle}>Masuk untuk mengakses sistem manajemen pengunjung</p>
        
        <form style={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="Masukkan email Anda"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Kata Sandi</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={{...styles.input, paddingRight: '2.5rem'}}
                placeholder="Masukkan password Anda"
                required
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {})
            }}
          >
            {isLoading ? 'Memuat...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
