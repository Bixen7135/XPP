import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  ClipboardList, 
  Library, 
  Menu, 
  X,
  ChevronDown,
  GraduationCap,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

type NavItemType = {
  path: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  className?: string;
} | {
  type: 'dropdown';
  icon: React.ReactNode;
  label: string;
  items: { path: string; label: string; }[];
};

export const Navigation = () => {
  const { t } = useLanguageStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [username, setUsername] = useState<string>('');

  const isTaskPreviewPage = location.pathname === '/task-preview';
  const isGenerateActive = location.pathname.includes('/generate-') || isTaskPreviewPage;
  const isProfileActive = location.pathname === '/profile';

  const navItems: NavItemType[] = [
    {
      path: '/',
      label: t('nav.home'),
      icon: <Home className="h-5 w-5" />,
      isActive: location.pathname === '/',
      className: 'transform transition-all duration-200 hover:scale-105 hover:shadow-md'
    },
    {
      path: '/generate-exam',
      label: t('nav.generateExam'),
      icon: <FileText className="h-5 w-5" />,
      isActive: location.pathname === '/generate-exam' || location.pathname === '/exam-preview',
      className: 'transform transition-all duration-200 hover:scale-105 hover:shadow-md'
    },
    {
      path: '/generate-task',
      label: t('nav.generateTask'),
      icon: <ClipboardList className="h-5 w-5" />,
      isActive: location.pathname === '/generate-task' || location.pathname === '/task-preview',
      className: 'transform transition-all duration-200 hover:scale-105 hover:shadow-md'
    },
    {
      path: '/library',
      label: t('nav.library'),
      icon: <Library className="h-5 w-5" />,
      isActive: location.pathname === '/library',
      className: 'transform transition-all duration-200 hover:scale-105 hover:shadow-md'
    }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setUsername(data.username);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const NavItem = ({ path, icon, label, isActive, className = '' }: { 
    path: string; 
    icon: React.ReactNode; 
    label: string; 
    isActive?: boolean;
    className?: string;
  }) => {
    const shouldHighlight = isActive || (path === '/generate-task' && isTaskPreviewPage);
    return (
      <NavLink
        to={path}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          shouldHighlight
            ? 'bg-blue-50 text-blue-600' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } ${className}`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </NavLink>
    );
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 transform transition-all duration-25 hover:scale-110">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 
                             bg-clip-text text-transparent hidden sm:inline">
                XPP
              </span>
            </Link>

            {/* Desktop Navigation - Added margin and adjusted spacing */}
            <div className="hidden md:flex items-center space-x-4 ml-12">
              {navItems.map((item, index) => 
                'type' in item ? (
                  <div key={index} className="relative">
                    <button
                      onClick={() => setIsGenerateMenuOpen(!isGenerateMenuOpen)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${ isGenerateActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                      <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${
                        isGenerateMenuOpen ? 'transform rotate-180' : ''
                      }`} />
                    </button>

                    <AnimatePresence>
                      {isGenerateMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                        >
                          {item.items.map((subItem, subIndex) => (
                            <NavLink
                              key={subIndex}
                              to={subItem.path}
                              className={({ isActive }) =>
                                `block px-4 py-2 text-sm ${
                                  isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`
                              }
                              onClick={() => setIsGenerateMenuOpen(false)}
                            >
                              {subItem.label}
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavItem key={index} path={item.path} icon={item.icon} label={item.label} isActive={item.isActive} className={item.className} />
                )
              )}
            </div>
          </div>

          {/* Auth Navigation - Moved to the right */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="relative ml-8">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transform transition-all duration-200 hover:scale-105 hover:shadow-md ${
                    isProfileActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className={`w-5 h-5 ${isProfileActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  <span className={isProfileActive ? 'text-blue-600' : 'text-gray-700'}>
                    {username || 'Profile'}
                  </span>
                </button>
                
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1"
                  >
                    <Link
                      to="/profile"
                      onClick={handleProfileClick}
                      className={`block px-4 py-2 text-sm ${
                        isProfileActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4 ml-8">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 
                       hover:bg-gray-100 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item, index) => 
                'type' in item ? (
                  <div key={index} className="space-y-1">
                    {item.items.map((subItem, subIndex) => (
                      <NavLink
                        key={subIndex}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-md text-base font-medium ${
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`
                        }
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <NavLink
                    key={index}
                    to={item.path}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        item.isActive || isActive || (item.path === '/generate-task' && isTaskPreviewPage)
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </div>
                  </NavLink>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};