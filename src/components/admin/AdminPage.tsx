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
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    // 触发自定义事件通知其他组件管理员状态已改变
    window.dispatchEvent(new CustomEvent('adminStatusChanged'));
    onBack();
  };
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
      onLogout={handleLogout}
    >
      {renderPage()}
    </AdminLayout>
  );
}
