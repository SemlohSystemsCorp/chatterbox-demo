import { useEffect } from 'react';

const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === '/') {
        event.preventDefault();
        // Trigger help action
        console.log('Help action triggered');
      } else if (event.metaKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        // Trigger unreads action
        console.log('All unreads action triggered');
      } else if (event.metaKey && event.key === 'K') {
        event.preventDefault();
        // Trigger search action
        console.log('Search action triggered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

export default useKeyboardShortcuts;