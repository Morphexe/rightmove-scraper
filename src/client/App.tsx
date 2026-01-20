import { useState } from 'react';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { PropertiesPage } from './components/properties/PropertiesPage';
import { ScrapePage } from './components/scrape/ScrapePage';
import { SettingsPage } from './components/settings/SettingsPage';

export type Page = 'properties' | 'scrape' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('properties');
  
  return (
    <>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'properties' && <PropertiesPage />}
        {currentPage === 'scrape' && <ScrapePage />}
        {currentPage === 'settings' && <SettingsPage />}
      </Layout>
      <Toaster 
        position="bottom-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))'
          }
        }}
      />
    </>
  );
}
