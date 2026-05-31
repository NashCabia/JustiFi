import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initLandingPage } from '../legacy/landing-init.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDashboardPath, getDisplayName } from '../services/justifiFirebase.js';
import StickyCarousel from '../components/StickyCarousel.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const navLabel = useMemo(() => getDisplayName(user), [user]);
  const navHref = useMemo(() => (user ? getDashboardPath(user) : '/login'), [user]);
  const floatingLabel = user ? 'ACCOUNT' : 'LOGIN';
  const floatingAria = user ? 'Account' : 'Login';

  useEffect(() => {
    // Prevent double-init in React StrictMode (dev-only double mounting)
    if (window.__justifiLandingInitRan) return;
    window.__justifiLandingInitRan = true;

    const cleanup = initLandingPage();
    return () => {
      try {
        cleanup?.();
      } finally {
        window.__justifiLandingInitRan = false;
      }
    };
  }, []);

  return (
    <>
      <nav className="navbar hide">
        <a className="logo" href="#home" aria-label="JustiFi Home">
          <img src="/assets/Icons/Coin3.png" alt="JustiFi coin" />
        </a>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#trailer">Trailer</a></li>
          <li><a href="#announcement">Announcement</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#characters">Characters</a></li>
        </ul>
        <a className="nav-user" href={navHref} id="nav-user">{navLabel}</a>
      </nav>

      <div className="floating-nav">
        <a href="#home" aria-label="Home">
          <img src="/assets/Icons/home.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">HOME</span>
        </a>
        <a href="#announcement" aria-label="News">
          <img src="/assets/Icons/megaphone.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">NEWS</span>
        </a>
        <a href="#about" aria-label="About">
          <img src="/assets/Icons/info.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">ABOUT</span>
        </a>
        <a href="#characters" aria-label="Characters">
          <img src="/assets/Icons/reading.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">CHARACTERS</span>
        </a>
        <a id="floating-auth" href={navHref} aria-label={floatingAria}>
          <img src="/assets/Icons/user.png" alt="" aria-hidden="true" />
          <span className="visually-hidden floating-auth-label">{floatingLabel}</span>
        </a>
      </div>

      <section id="home" className="hero room">
        <div className="room-stage">
          <div className="room-layer room-layer--background" aria-hidden="true" />
          <div className="room-layer room-layer--cloud1" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2" aria-hidden="true" />
          <div className="room-layer room-layer--cloud3" aria-hidden="true" />
          <div className="room-layer room-layer--cloud4" aria-hidden="true" />
          <div className="room-layer room-layer--cloud5" aria-hidden="true" />
          <div className="room-layer room-layer--cloud6" aria-hidden="true" />
          <div className="room-layer room-layer--school" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2A" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2B" aria-hidden="true" />
          <div className="room-layer room-layer--cloud3A" aria-hidden="true" />

          <div className="JustifiLogo">
            <img src="/assets/Title/JustiFiLogo.png" alt="Logo" />
          </div>

          <div className="JustifiAction">
            <button className="justifi-btn" type="button" aria-label="JustiFi button">
              <img src="/assets/Parallax/Button.png" alt="Button" />
            </button>
          </div>

          <div className="room-layer room-layer--slot" aria-hidden="true" />
          <div className="room-layer room-layer--slot" aria-hidden="true" />
          <div className="Coin">
            <div className="coin-anim" aria-hidden="true">
              <img src="/assets/Parallax/Coin3.png" className="coin-frame coin-frame--3" alt="" />
              <img src="/assets/Parallax/Coin1.png" className="coin-frame coin-frame--1" alt="" />
              <img src="/assets/Parallax/Coin2.png" className="coin-frame coin-frame--2" alt="" />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="trailer" className="trailer section-bg bg1">
        <div className="overlay" />

        <div className="content trailer-content">
          <div className="trailer-grid">
            <div className="trailer-copy">
              <p className="trailer-kicker">A glimpse into JustiFi</p>
              <p className="trailer-description">
                Step into a choice-driven story where every decision shapes the outcome.
                Watch the teaser to see how JustiFi turns legal education into an
                immersive, cinematic experience.
              </p>
            </div>

            <div className="trailer-media">
              <div className="trailer-video" role="img" aria-label="YouTube trailer placeholder">
                <div className="trailer-video-inner">
                  {/* <span>YOUTUBE TRAILER PLACEHOLDER</span> */}
                </div>
                <button className="trailer-play" type="button" aria-label="Play trailer">
                  <span className="trailer-play-icon" aria-hidden="true" />
                </button>
              </div>
              <p className="trailer-caption">Teaser from the visual novel experience</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="announcement" className="announcement section-bg bg2">
        <div className="overlay" />

        <div className="content announcement-content">
          <div className="corkboard-panel">
            <div className="corkboard-left">
              <div className="corkboard-title">
                <img src="/assets/Background/announcement.svg" alt="title" className="title" aria-hidden="true" />
              </div>
              
            </div>
            <div className="prof-wrap">
  <img src="/assets/Characters/prof.png" alt="Prof" className="prof-img" />
</div>

            <div className="corkboard-right">
              <StickyCarousel />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="about" className="section-bg bg3">
        <div className="overlay" />

        <div className="content">
          <div className="about-layout">
            <div className="about-left">
              <img
  src="/assets/Background/ab.svg"
  alt="About JustiFi"
  className="about-title-img"
/>

              <p className="about-description">
                JustiFi is an interactive, choice-driven visual novel designed to
                improve legal literacy among senior high school students.
                The game immerses players in realistic scenarios involving
                youth protection, cyber safety, gender awareness, and police
                encounters, allowing them to make decisions and experience
                the consequences of their actions.
              </p>

              <p className="about-description">
                Through branching narratives and decision-based gameplay,
                JustiFi transforms legal education into an engaging and
                immersive learning experience that promotes critical thinking,
                awareness, and responsible decision-making.
              </p>

              <div className="about-buttons">
                <button
                  id="viewTeamButton"
                  className="about-btn primary-btn"
                  type="button"
                  onClick={() => navigate('/team')}
                >
                  VIEW THE TEAM
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section id="characters" className="characters section-bg bg4">
        <div className="overlay" />
        <div className="content">
          <img
  src="/assets/Background/cha.svg"
  alt="Characters"
  className="characters-title-img"
/>

          <div className="character-layout">
            <div className="slider-area">
              <div className="card-stack" aria-label="Character cards">
                <div className="swipe-card" data-card="0">
                  <img src="/assets/Characters/character.png" alt="Character card" />
                </div>
                <div className="swipe-card" data-card="1" aria-hidden="true">
                  <img src="/assets/Background/background.png" alt="" />
                </div>
                <div className="swipe-card" data-card="2" aria-hidden="true">
                  <img src="/assets/Characters/character.png" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section className="gallery">
        <img
  src="/assets/Background/gam.svg"
  alt="Gameplay Preview"
  className="gameplay-title-img"
/>
        <div className="gallery-grid">
          <div className="gallery-item" role="button" tabIndex={0} aria-expanded="false" data-world="World 1 Preview">
            <div className="gallery-frame">
              <div className="gallery-face gallery-front">
                <img src="/assets/Background/world_1.png" alt="World preview 1" />
              </div>
              <div className="gallery-face gallery-back" aria-hidden="true">
                <img className="world-preview-large" src="/assets/Background/world_1.png" alt="World 1 large preview" />
                <div className="world-desc">
                  <h3>SCHOOL</h3>
                  <p>SCHOOL</p>
                </div>
              </div>
            </div>
          </div>

          <div className="gallery-item" role="button" tabIndex={0} aria-expanded="false" data-world="World 2 Preview">
            <div className="gallery-frame">
              <div className="gallery-face gallery-front">
                <img src="/assets/Background/world_2.png" alt="World preview 2" />
              </div>
              <div className="gallery-face gallery-back" aria-hidden="true">
                <img className="world-preview-large" src="/assets/Background/world_2.png" alt="World 2 large preview" />
                <div className="world-desc">
                  <h3>CLASSROOM</h3>
                  <p>CLASSROOM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="gallery-item" role="button" tabIndex={0} aria-expanded="false" data-world="World 3 Preview">
            <div className="gallery-frame">
              <div className="gallery-face gallery-front">
                <img src="/assets/Background/world_3.png" alt="World preview 3" />
              </div>
              <div className="gallery-face gallery-back" aria-hidden="true">
                <img className="world-preview-large" src="/assets/Background/world_3.png" alt="World 3 large preview" />
                <div className="world-desc">
                  <h3>OFFICE</h3>
                  <p>OFFICE</p>
                </div>
              </div>
            </div>
          </div>

          <div className="gallery-item" role="button" tabIndex={0} aria-expanded="false" data-world="World 4 Preview">
            <div className="gallery-frame">
              <div className="gallery-face gallery-front">
                <img src="/assets/Background/world_4.png" alt="World preview 4" />
              </div>
              <div className="gallery-face gallery-back" aria-hidden="true">
                <img className="world-preview-large" src="/assets/Background/world_4.png" alt="World 4 large preview" />
                <div className="world-desc">
                  <h3>HALLWAY</h3>
                  <p>HALLWAY</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="gallery-overlay" aria-hidden="true" />
      </section>

      
<footer className="site-footer">
  <div className="footer-content">
    <h3>JavaChip.exe</h3>

    <p className="footer-copy">© 2026 JavaChip.exe. All rights reserved.</p>

    <div className="footer-info">
      <p><strong>Contact Us:</strong> +63 912 345 6789</p>
      <p><strong>Email:</strong> justifi@gmail.com</p>
      <p>
        <strong>Helpline:</strong>{" "}
        <a
          href="https://pia.gov.ph/news/makabata-helpline-1383-a-door-of-hope-recovery-for-child-abuse-victims/?__cf_chl_tk=rQj4XKt62R4U8yaJTTsvT6uf3jurM1gl9w95m8in0lc-1777733372-1.0.1.1-z8tc0m6Kw2sdPtYpssGveHJguR6uno0PQGvVM9oPdzw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Makabata Helpline 1383
        </a>
      </p>
    </div>
  </div>
</footer> 
    </>
  );
}
