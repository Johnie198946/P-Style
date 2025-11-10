import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Dashboard } from './Dashboard';
import { UsersManagement } from './UsersManagement';
import { SubscriptionsManagement } from './SubscriptionsManagement';
import { PaymentsManagement } from './PaymentsManagement';
import { UsageManagement } from './UsageManagement';
import { TasksManagement } from './TasksManagement';
import { ContentManagement } from './ContentManagement';
import { Analytics } from './Analytics';

interface AdminPageProps {
  onLogout: () => void;
}

export function AdminPage({ onLogout }: AdminPageProps) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UsersManagement />;
      case 'subscriptions':
        return <SubscriptionsManagement />;
      case 'payments':
        return <PaymentsManagement />;
      case 'usage':
        return <UsageManagement />;
      case 'tasks':
        return <TasksManagement />;
      case 'content':
        return <ContentManagement />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={onLogout}
    >
      {renderPage()}
    </AdminLayout>
  );
}
