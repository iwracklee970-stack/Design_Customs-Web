import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Editor } from './components/Editor';
import { getInitialTheme, applyTheme, toggleTheme, type Theme } from './utils/theme';

function App() {
  const [inStudio, setInStudio] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => toggleTheme(prev));
  };

  return inStudio ? (
    <Editor theme={theme} onToggleTheme={handleToggleTheme} />
  ) : (
    <LandingPage onEnter={() => setInStudio(true)} theme={theme} onToggleTheme={handleToggleTheme} />
  );
}

export default App;
