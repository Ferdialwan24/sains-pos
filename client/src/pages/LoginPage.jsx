import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const { showToast } = useToast();
  const [hasLogoError, setHasLogoError] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/cashier/tables'} replace />;
  }

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const loggedInUser = await login(form);
      const fallbackPath = loggedInUser.role === 'admin' ? '/admin/dashboard' : '/cashier/tables';
      const nextPath = location.state?.from?.pathname ?? fallbackPath;
      showToast({
        title: 'Login successful',
        message: `Welcome back, ${loggedInUser.fullName}.`,
        type: 'success'
      });
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Login failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-brand">
          {!hasLogoError ? (
            <img
              alt="Sains POS logo"
              className="login-logo-image"
              onError={() => setHasLogoError(true)}
              src="/brand-logo.jpg"
            />
          ) : (
            <div className="login-logo-fallback">SP</div>
          )}
          
          <h2>Sign in to the local POS server</h2>
          
        </div>

        <form className="form-grid login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              name="username"
              onChange={handleChange}
              required
              value={form.username}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
}
