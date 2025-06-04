'use client';
import React, { useEffect, useState } from 'react';

const LayoutDebugger: React.FC = () => {
  const [stats, setStats] = useState({
    bodyWidth: 0,
    windowWidth: 0,
    scrollWidth: 0,
    hasHorizontalScroll: false
  });

  const updateStats = () => {
    if (typeof window !== 'undefined') {
      const bodyWidth = document.body.offsetWidth;
      const windowWidth = window.innerWidth;
      const scrollWidth = document.body.scrollWidth;
      const hasHorizontalScroll = scrollWidth > windowWidth;

      setStats({
        bodyWidth,
        windowWidth,
        scrollWidth,
        hasHorizontalScroll
      });
    }
  };

  useEffect(() => {
    updateStats();
    
    const handleResize = () => updateStats();
    window.addEventListener('resize', handleResize);
    
    // Update every 2 seconds to catch dynamic changes
    const interval = setInterval(updateStats, 2000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: stats.hasHorizontalScroll ? '#ff4d4f' : '#52c41a',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 10000,
      fontFamily: 'monospace'
    }}>
      <div><strong>Layout Debug</strong></div>
      <div>Body: {stats.bodyWidth}px</div>
      <div>Window: {stats.windowWidth}px</div>
      <div>Scroll: {stats.scrollWidth}px</div>
      <div>
        Status: {stats.hasHorizontalScroll ? '❌ SCROLL DETECTED' : '✅ NO SCROLL'}
      </div>
    </div>
  );
};

export default LayoutDebugger; 