import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const { showToast } = useToast();
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
    <section className="page">
      <div className="hero-card">
        <p className="eyebrow">Sains POS</p>
        <h2>Sign in to the local POS server</h2>
        <p className="muted">Use the admin or cashier account registered by the administrator.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
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
