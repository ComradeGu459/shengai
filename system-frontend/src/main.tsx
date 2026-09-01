import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './styles.css';
import './responsive.css';
import './security.css';
import './runtime.css';
import './feedback.css';

createRoot(document.getElementById('root')!).render(<App />);
