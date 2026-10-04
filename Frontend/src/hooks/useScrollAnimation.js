import { useEffect } from 'react';

/**
 * useScrollAnimation Hook
 * Adds scroll-triggered reveal animations to elements with .reveal class
 * Uses IntersectionObserver for performance
 */
export const useScrollAnimation = (deps = []) => {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, deps);
};

/**
 * useCounterAnimation Hook
 * Animates numbers counting up when they scroll into view
 */
export const useCounterAnimation = (deps = []) => {
  useEffect(() => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target;
          const target = parseInt(element.dataset.count, 10);
          const suffix = element.dataset.suffix || '';
          const duration = 1500;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          let frame = 0;

          const animate = () => {
            frame++;
            current = Math.min(Math.ceil(increment * frame), target);
            element.textContent = current + suffix;

            if (current < target) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(element);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, deps);
};

export default useScrollAnimation;
