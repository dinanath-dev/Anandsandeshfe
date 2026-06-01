import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </BrowserRouter>
);
