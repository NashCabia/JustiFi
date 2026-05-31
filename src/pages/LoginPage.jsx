import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getDashboardPath,
  getDisplayName,
  getCurrentUser,
  login,
  registerUser,
  resetPassword
} from '../services/justifiFirebase.js';


const REMEMBER_KEY = 'justifi_remember_me';
const REMEMBER_EMAIL_KEY = 'justifi_remember_email';
const REMEMBER_PASSWORD_KEY = 'justifi_remember_password';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [floatingMessage, setFloatingMessage] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  const panelClassName = useMemo(() => {
    return ['auth-panel', mode === 'register' ? 'show-register' : ''].filter(Boolean).join(' ');
  }, [mode]);

  function showFloatingPanel(message) {
    setFloatingMessage(message);
    window.setTimeout(() => setFloatingMessage(null), 3000);
  }

  function saveRememberedLogin(email, password, remember) {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, 'true');
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_PASSWORD_KEY);
    }
  }

  function restoreRememberedLogin() {
    const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
    const email = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    const password = localStorage.getItem(REMEMBER_PASSWORD_KEY) || '';

    setRememberMe(remember);
    if (remember) {
      setLoginEmail(email);
      setLoginPassword(password);
    }
  }

  useEffect(() => {
    restoreRememberedLogin();

    // If already logged in, redirect to dashboard
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          navigate(getDashboardPath(user), { replace: true });
        }
      } catch {
        // ignore
      }
    })();

    // Handle legacy ?logout=1 behavior (remove it so refresh doesn't loop)
    if (searchParams.get('logout') === '1') {
      searchParams.delete('logout');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  async function handleRegister() {
    const payload = {
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim(),
      password: regPassword
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
      showFloatingPanel('Please complete the required fields.');
      return;
    }

    if (payload.password.length < 6) {
      showFloatingPanel('Password must be at least 6 characters.');
      return;
    }

    try {
      await registerUser(payload);
      showFloatingPanel('Verification email sent. Please verify your email first, then log in.');
      setMode('login');
    } catch (error) {
      const msg = error?.message || 'Registration failed.';
      showFloatingPanel(msg);
    }
  }

  async function handleLogin() {
    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      showFloatingPanel('Please enter your email and password.');
      return;
    }

    try {
      const user = await login(email, password, { remember: rememberMe });

      saveRememberedLogin(email, password, rememberMe);

      // Profile completion routing can be added when profile page is converted
      navigate(getDashboardPath(user));
    } catch (error) {
      showFloatingPanel(error?.message || 'Login failed.');
    }
  }

  async function handleSendReset() {
    const email = forgotEmail.trim();

    if (!email) {
      showFloatingPanel('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      showFloatingPanel('Please enter a valid email address');
      return;
    }

    try {
      setForgotBusy(true);
      await resetPassword(email);
      showFloatingPanel('Reset email sent! Check your inbox.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (error) {
      showFloatingPanel('Error sending reset email: ' + (error?.message || 'Unknown error'));
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <>
      <div className="background">
        <img src="/assets/Login/LoginBG.jpg" alt="Background Image" />
      </div>

      <div className="auth-frame">
        <img src="/assets/Background/frame.svg" alt="Frame" className="frame-img" />

        <div className="auth-container">
          <div className={panelClassName}>
            <div className="form login">
              <img
  src="/assets/Login/login.svg"
  alt="Login"
  className="login-title-img"
/>
              <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" placeholder="Email" />
              <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" placeholder="Password" />

             <div className="remember-forgot-row">
  <label className="remember-row">
    <input
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
      type="checkbox"
    />
    Remember Me
  </label>

  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      setForgotOpen(true);
    }}
    className="forgot-link"
  >
    Forgot Password?
  </a>
</div>

<button className="login-btn" onClick={handleLogin}>
  Login
</button>

<p className="auth-prompt">Don't have an account?</p>
              <button className="switch" onClick={() => setMode('register')}>Register</button>
              <a className="back" href="/">
                <img src="/assets/Login/back-button.png" alt="Back to Site" />
              </a>
            </div>

            <div className="info-area">
              <img src="/assets/Login/justifi-logo.png" alt="JustiFi" className="justifi-logo" />
            </div>

            <div className="form register register-scroll">
              <img
  src="/assets/Login/ca.svg"
  alt="Create Account"
  className="register-title-img"
/>
              <div className="two-col">
                <input value={regLastName} onChange={(e) => setRegLastName(e.target.value)} type="text" placeholder="Last name" />
                <input value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} type="text" placeholder="First name" />
              </div>
              <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" placeholder="Email" />
              <input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type="password" placeholder="Password" />

              <button onClick={handleRegister}>Register</button>
              <p>Already have an account?</p>
              <button className="switch" onClick={() => setMode('login')}>Login</button>
              <a className="back" href="/">
                <img src="/assets/Login/back-button.png" alt="Back to Site" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={['forgot-modal', forgotOpen ? '' : 'hidden'].join(' ')}>
        <div className="forgot-modal-content">
          <button className="forgot-modal-close" onClick={() => setForgotOpen(false)}>&times;</button>
          <h2>Reset Password</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
          <input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} type="email" placeholder="Enter your email" />
          <button onClick={handleSendReset} disabled={forgotBusy}>
            {forgotBusy ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p className="forgot-modal-back"><a href="#" onClick={(e) => { e.preventDefault(); setForgotOpen(false); }}>Back to Login</a></p>
        </div>
        <div className="forgot-modal-overlay" onClick={() => setForgotOpen(false)} />
      </div>

      <div className={['floating-panel', floatingMessage ? '' : 'hidden'].join(' ')}>
        <span>{floatingMessage || ''}</span>
      </div>
    </>
  );
}
