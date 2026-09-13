import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import navLogoImage from '../../assets/nav-logo.png';
import styles from './Login.module.css';

export function LoginPageComponent() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    username: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'cashier' ? '/cashier/pos' : '/admin/dashboard'} replace />;
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
      const fallbackPath = loggedInUser.role === 'cashier' ? '/cashier/pos' : '/admin/dashboard';
      showToast({
        title: 'Login successful',
        message: `Welcome back, ${loggedInUser.fullName}.`,
        type: 'success'
      });
      navigate(fallbackPath, { replace: true });
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
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.brandPanel}>
          <div className={styles.brandPanelContent}>
            <div className={styles.brandMain}>
              <h1>Crafting culinary success, one order at a time.</h1>
              <p>Experience the most intuitive point-of-sale system designed specifically for modern restaurants, bistros, and cafes.</p>
            </div>
            
            <div className={styles.brandFooter}>
              <span>&copy; {new Date().getFullYear()} Sains POS. All rights reserved.</span>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.card}>
            <div className={styles.formHeader}>
              <div className={styles.formLogoWrap}>
                <img alt="Sains POS logo" className={styles.formLogo} src={navLogoImage} />
              </div>
              <h2>Welcome back</h2>
              <p>Please enter your credentials to access the POS terminal.</p>
            </div>

            <form className={`form-grid ${styles.form}`} onSubmit={handleSubmit}>
              <label className="field">
                <span>Username</span>
                <input
                  autoComplete="username"
                  name="username"
                  onChange={handleChange}
                  placeholder="Enter your username"
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
                  placeholder="••••••••"
                  required
                  type="password"
                  value={form.password}
                />
              </label>

              {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Signing in...' : 'Sign In to Terminal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
