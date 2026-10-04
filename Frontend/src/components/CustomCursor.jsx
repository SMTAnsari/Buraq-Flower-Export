import { useState, useEffect } from 'react';
import './CustomCursor.css';

export default function CustomCursor() {
  const [pos,     setPos]     = useState({ x: -100, y: -100 });
  const [isHover, setIsHover] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setVisible(true);

    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });

    const onEnter = (e) => {
      setIsImage(e.target.tagName.toLowerCase() === 'img');
      setIsHover(true);
    };
    const onLeave = () => { setIsHover(false); setIsImage(false); };

    window.addEventListener('mousemove', onMove);

    const targets = document.querySelectorAll('a, button, img, [data-cursor]');
    targets.forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      targets.forEach(el => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        className={`cursor-ring${isHover ? ' cursor-ring--hover' : ''}${isImage ? ' cursor-ring--image' : ''}`}
        style={{ transform: `translate(${pos.x - 16}px, ${pos.y - 16}px)` }}
      >
        {isImage && <span className="cursor-label">VIEW</span>}
      </div>
      <div
        className="cursor-dot"
        style={{ transform: `translate(${pos.x - 3}px, ${pos.y - 3}px)` }}
      />
    </>
  );
}
