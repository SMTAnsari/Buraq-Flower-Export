import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import './PageLoader.css';

const PageLoader = () => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1200);
    const t2 = setTimeout(() => setVisible(false), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div className={`pl-overlay ${fading ? 'pl-fade' : ''}`}>
      <div className="pl-content">
        <img src={logoImg} alt="Buraq Flower Exports" className="pl-logo-img" />
        <div className="pl-bar-track">
          <div className="pl-bar" />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
