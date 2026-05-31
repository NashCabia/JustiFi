import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebaseClient.js';

const ANNOUNCEMENT_COLLECTIONS = ['publicAnnouncements', 'announcements'];
const LOCAL_ANNOUNCEMENTS_KEY = 'justifiLocalAnnouncements';

function readLocalAnnouncements() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAnnouncementTime(item) {
  // Firestore Timestamp has toDate()
  if (item.createdAt && typeof item.createdAt.toDate === 'function') {
    return item.createdAt.toDate().getTime();
  }

  return new Date(item.createdAt || 0).getTime();
}

export default function StickyCarousel() {
  const [announcements, setAnnouncements] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const resolvedAnnouncements = useMemo(() => {
    if (!announcements.length) {
      return [{ id: 'empty', title: 'No Announcements', description: 'Add one from the developer page.' }];
    }

    return announcements;
  }, [announcements]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const localAnnouncements = readLocalAnnouncements();

      try {
        const snapshots = await Promise.all(
          ANNOUNCEMENT_COLLECTIONS.map(async (collectionName) => {
            const snap = await getDocs(query(collection(db, collectionName), orderBy('createdAt', 'desc')));
            return snap.docs
              .map((docSnap) => ({ id: docSnap.id, source: collectionName, ...docSnap.data() }))
              .filter((item) => item.title || item.description);
          })
        );

        const merged = new Map();

        for (const rows of snapshots) {
          for (const row of rows) {
            if (!merged.has(row.id) || row.source === 'publicAnnouncements') {
              merged.set(row.id, row);
            }
          }
        }

        let next = Array.from(merged.values());

        for (const localItem of localAnnouncements) {
          if (!next.some((row) => row.id === localItem.id)) {
            next.push(localItem);
          }
        }

        next.sort((a, b) => getAnnouncementTime(b) - getAnnouncementTime(a));

        if (!cancelled) {
          setAnnouncements(next);
          setActiveIndex(0);
        }
      } catch (error) {
        console.error('Error loading announcements:', error);

        const next = localAnnouncements.sort((a, b) => getAnnouncementTime(b) - getAnnouncementTime(a));
        if (!cancelled) {
          setAnnouncements(next);
          setActiveIndex(0);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);



  const total = resolvedAnnouncements.length;
  const prevIndex = total > 0 ? (activeIndex - 1 + total) % total : 0;
  const nextIndex = total > 0 ? (activeIndex + 1) % total : 0;

  function goTo(offset) {
    if (total <= 1) return;
    setActiveIndex((idx) => (idx + offset + total) % total);
  }

  return (
    <div className="sticky-carousel" aria-label="Announcement sticky notes">
      <button
        className="sticky-arrow sticky-prev"
        type="button"
        aria-label="Previous announcement"
        onClick={() => goTo(-1)}
        style={{ display: total > 1 ? undefined : 'none' }}
      >
        <img src="/assets/Icons/right.svg" alt="" aria-hidden="true" />
      </button>

      <div className="sticky-window">
        {resolvedAnnouncements.map((item, index) => {
          const title = item.title || 'Announcement';
          const description = item.description || 'No description available.';

          const classes = ['sticky-note'];
          let ariaHidden = true;

          if (index === activeIndex) {
            classes.push('is-active');
            ariaHidden = false;
          } else if (total > 1 && index === prevIndex) {
            classes.push('is-prev');
          } else if (total > 1 && index === nextIndex) {
            classes.push('is-next');
          }

          return (
            <article key={item.id || index} className={classes.join(' ')} aria-hidden={ariaHidden}>
              <div className="sticky-pin" aria-hidden="true" />
              <div className="sticky-content">
                <h3 className="sticky-title">{title}</h3>
                <div className="sticky-body"><p>{description}</p></div>
              </div>
            </article>
          );
        })}
      </div>

      <button
        className="sticky-arrow sticky-next"
        type="button"
        aria-label="Next announcement"
        onClick={() => goTo(1)}
        style={{ display: total > 1 ? undefined : 'none' }}
      >
        <img src="/assets/Icons/right.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
