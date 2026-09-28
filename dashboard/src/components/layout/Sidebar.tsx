import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, GitBranch, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Repositories', path: '/repos', icon: GitBranch },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-[var(--border)]">
        <Shield className="h-6 w-6 text-indigo-500 mr-2" />
        <span className="text-lg font-bold tracking-tight text-white">CodeWarden</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-[var(--bg-tertiary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={clsx(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-indigo-500' : 'text-[var(--text-secondary)] group-hover:text-indigo-400'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile + logout */}
      {user && (
        <div className="flex-shrink-0 border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user.avatarUrl}
              alt={user.login}
              className="h-8 w-8 rounded-full ring-2 ring-indigo-500/40"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">@{user.login}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
