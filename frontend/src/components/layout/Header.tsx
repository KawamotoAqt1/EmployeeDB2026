import { useAuth } from '@/hooks/useAuth';
import { NavLink } from 'react-router-dom';

export function Header() {
  const { user, logout } = useAuth();
  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isEditor = role === 'ADMIN' || role === 'EDITOR';

  const handleLogout = async () => {
    await logout();
  };

  // Navigation tab style
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClass = 'px-4 py-4 text-sm font-medium transition-colors';
    if (isActive) {
      return `${baseClass} text-white border-b-2 border-white bg-[#006CBE]`;
    }
    return `${baseClass} text-white/90 hover:text-white hover:bg-[#006CBE]`;
  };

  return (
    <header className="bg-[#0078D4] fixed top-0 left-0 right-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo and Navigation */}
          <div className="flex items-center h-full">
            {/* Logo */}
            <NavLink to="/" className="flex items-center text-white font-bold text-lg mr-6">
              employees
            </NavLink>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center h-full">
              <NavLink to="/employees" className={getNavLinkClass}>
                社員
              </NavLink>
              <NavLink to="/companies" className={getNavLinkClass}>
                企業
              </NavLink>
              <NavLink to="/projects" className={getNavLinkClass}>
                案件
              </NavLink>
              {isEditor && (
                <NavLink to="/tags" className={getNavLinkClass}>
                  タグ
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/users" className={getNavLinkClass}>
                  ユーザー
                </NavLink>
              )}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-white/90 hover:text-white hover:bg-[#006CBE] px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
