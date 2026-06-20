import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <LanguageProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LanguageProvider>
  </BrowserRouter>
);
