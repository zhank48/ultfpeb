import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

import { useSidebar } from '../hooks/useResponsive.js';
import { SidebarLogo } from '../components/BrandLogo.jsx';
import './LayoutCoreUILight.css';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  UserPlus, 
  Eye, 
  Settings, 
  User, 
  LogOut,
  ChevronDown,
  Bell,
  Grid3X3,
  FileText,
  Package,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  Wrench,
  UserCheck,
  BarChart3,
  Sliders
} from 'lucide-react';

export function LayoutCoreUILight({ children }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lostItemsMenuOpen, setLostItemsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [guestbookMenuOpen, setGuestbookMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  // Default brand data since BrandContext is removed
  const brandData = {
    brandName: 'ULT FPEB',
    shortName: 'ULT FPEB',
    logoUrl: '/logoultfpeb.png',
    primaryColor: '#fd591c',
    secondaryColor: '#df2128'
  };
  const { sidebarOpen, toggleSidebar, closeSidebar, isMobile, isTablet, isDesktop } = useSidebar();
  // Close sidebar when clicking outside on mobile and tablet
  useEffect(() => {
    const handleClickOutside = (event) => {
      if ((isMobile || isTablet) && sidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const menuButton = document.getElementById('menu-button');
        
        if (sidebar && !sidebar.contains(event.target) && 
            menuButton && !menuButton.contains(event.target)) {
          closeSidebar();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isTablet, sidebarOpen, closeSidebar]);

  // Menu configuration based on user role
  const getMenusByRole = (userRole) => {
    const baseMenus = [
      { name: 'Dasbor', href: '/app/dashboard', icon: Home, current: location.pathname === '/app/dashboard' },
      { 
        name: 'Buku Tamu', 
        icon: BookOpen, 
        current: location.pathname.includes('/app/check-in') || location.pathname.includes('/app/visitors') || location.pathname.includes('/app/reports'),
        isDropdown: true,
        stateKey: 'guestbook',
        children: [
          { name: 'Check-in', href: '/app/check-in', current: location.pathname === '/app/check-in' },
          { name: 'Pengunjung', href: '/app/visitors', current: location.pathname === '/app/visitors' },
          { name: 'Laporan', href: '/app/reports', current: location.pathname === '/app/reports' }
        ]
      }
    ];

    // Menu untuk Admin - akses penuh
    if (userRole === 'admin' || userRole === 'Admin') {
      return [
        ...baseMenus,
        { 
          name: 'Barang Hilang', 
          icon: Package, 
          current: location.pathname.includes('/app/lost-items'),
          isDropdown: true,
          stateKey: 'lostItems',
          children: [
            { name: 'Form Registrasi', href: '/app/lost-items', current: location.pathname === '/app/lost-items' },
            { name: 'Manajemen Data', href: '/app/lost-items/data', current: location.pathname === '/app/lost-items/data' }
          ]
        },
        { 
          name: 'Pengaturan', 
          icon: Settings, 
          current: location.pathname.includes('/app/configuration-management') || 
                   location.pathname.includes('/app/feedback-management') || 
                   location.pathname.includes('/app/complaint-management') || 
                   location.pathname.includes('/app/visitor-management') ||
                   location.pathname.includes('/app/user-management') || 
                   location.pathname === '/app/profile',
          isDropdown: true,
          stateKey: 'settings',
          children: [
            { name: 'Manajemen Konfigurasi', href: '/app/configuration-management', current: location.pathname === '/app/configuration-management' },
            { name: 'Manajemen Umpan Balik', href: '/app/feedback-management', current: location.pathname === '/app/feedback-management' },
            { name: 'Manajemen Keluhan', href: '/app/complaint-management', current: location.pathname === '/app/complaint-management' },
            { name: 'Permintaan Hapus Pengunjung', href: '/app/visitor-management', current: location.pathname === '/app/visitor-management' },
            { name: 'Manajemen Pengguna', href: '/app/user-management', current: location.pathname === '/app/user-management' },
            { name: 'Profil', href: '/app/profile', current: location.pathname === '/app/profile' }
          ]
        }
      ];
    }

    // Menu untuk Resepsionis - akses terbatas
    if (userRole === 'resepsionis' || userRole === 'Resepsionis' || userRole === 'receptionist' || userRole === 'Receptionist') {
      return [
        ...baseMenus,
        { 
          name: 'Barang Hilang', 
          icon: Package, 
          current: location.pathname.includes('/app/lost-items'),
          isDropdown: true,
          stateKey: 'lostItems',
          children: [
            { name: 'Form Registrasi', href: '/app/lost-items', current: location.pathname === '/app/lost-items' },
            { name: 'Manajemen Data', href: '/app/lost-items/data', current: location.pathname === '/app/lost-items/data' }
          ]
        },
        { 
          name: 'Pengaturan', 
          icon: Settings, 
          current: location.pathname.includes('/app/feedback-management') || 
                   location.pathname.includes('/app/complaint-management') || 
                   location.pathname === '/app/profile',
          isDropdown: true,
          stateKey: 'settings',
          children: [
//            { name: 'Manajemen Umpan Balik', href: '/app/feedback-management', current: location.pathname === '/app/feedback-management' },
//            { name: 'Manajemen Keluhan', href: '/app/complaint-management', current: location.pathname === '/app/complaint-management' },
            { name: 'Profil', href: '/app/profile', current: location.pathname === '/app/profile' }
          ]
        }
      ];
    }

    // Default menu jika role tidak dikenali
    return baseMenus;
  };

  const navigation = getMenusByRole(user?.role);

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>      {/* Mobile/Tablet Overlay */}
      {(isMobile || isTablet) && sidebarOpen && (
        <div 
          className="overlay"          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40
          }}
          onClick={closeSidebar}
        />
      )}      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`sidebar-scroll sidebar-transition ${(isMobile || isTablet) ? 'sidebar-mobile' : 'sidebar-desktop'} ${sidebarOpen ? 'open' : 'closed'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '256px',
          backgroundColor: 'white',
          borderRight: '1px solid #dee2e6',
          zIndex: 50,
          overflowY: 'auto',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: sidebarOpen && (isMobile || isTablet) ? '0 10px 25px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          height: '60px',
          padding: '6px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #dee2e6'
        }}>          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
            <SidebarLogo onClick={() => navigate('/app/dashboard')} />
          </div>          <button
            onClick={closeSidebar}
            style={{
              display: (isMobile || isTablet) ? 'block' : 'none',
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#6c757d',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px 0' }}>
          <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#6c757d', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              NAVIGASI
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {navigation.map((item) => {
              const Icon = item.icon;
              
              if (item.isDropdown) {
                // Get the appropriate state and setter based on stateKey
                let isOpen = false;
                let toggleFunction = () => {};
                
                switch (item.stateKey) {
                  case 'guestbook':
                    isOpen = guestbookMenuOpen;
                    toggleFunction = () => setGuestbookMenuOpen(!guestbookMenuOpen);
                    break;
                  case 'lostItems':
                    isOpen = lostItemsMenuOpen;
                    toggleFunction = () => setLostItemsMenuOpen(!lostItemsMenuOpen);
                    break;
                  case 'settings':
                    isOpen = settingsMenuOpen;
                    toggleFunction = () => setSettingsMenuOpen(!settingsMenuOpen);
                    break;
                  default:
                    break;
                }
                
                return (
                  <div key={item.name}>
                    {/* Parent Menu Item */}
                    <div
                      onClick={toggleFunction}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 24px',
                        margin: '0 12px',
                        borderRadius: brandData.borderRadius || '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: item.current ? (brandData.primaryColor || '#0d6efd') : (brandData.textColor || '#495057'),
                        backgroundColor: item.current ? `${brandData.primaryColor || '#0d6efd'}20` : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: item.current ? `1px solid ${brandData.primaryColor || '#0d6efd'}40` : '1px solid transparent'
                      }}
                      onMouseOver={(e) => {
                        if (!item.current) {
                          e.currentTarget.style.backgroundColor = brandData.backgroundColor || '#f8f9fa';
                          e.currentTarget.style.color = brandData.textColor || '#212529';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!item.current) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = brandData.textColor || '#495057';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Icon size={18} style={{ 
                          color: item.current ? (brandData.primaryColor || '#0d6efd') : (brandData.secondaryColor || '#6c757d')
                        }} />
                        {item.name}
                      </div>
                      <ChevronDown 
                        size={16} 
                        style={{ 
                          color: brandData.secondaryColor || '#6c757d',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    </div>
                    
                    {/* Dropdown Children */}
                    {isOpen && (
                      <div style={{ 
                        marginLeft: '12px', 
                        marginRight: '12px',
                        marginBottom: '4px',
                        borderLeft: '2px solid #e9ecef',
                        paddingLeft: '12px'
                      }}>
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            to={child.href}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 16px',
                              borderRadius: brandData.borderRadius || '6px',
                              fontSize: '13px',
                              fontWeight: '400',
                              color: child.current ? (brandData.primaryColor || '#0d6efd') : '#6c757d',
                              backgroundColor: child.current ? `${brandData.primaryColor || '#0d6efd'}15` : 'transparent',
                              textDecoration: 'none',
                              transition: 'all 0.2s',
                              marginBottom: '2px'
                            }}
                            onClick={() => (isMobile || isTablet) && closeSidebar()}
                            onMouseOver={(e) => {
                              if (!child.current) {
                                e.target.style.backgroundColor = '#f8f9fa';
                                e.target.style.color = '#495057';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!child.current) {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#6c757d';
                              }
                            }}
                          >
                            {child.icon ? (
                              <child.icon size={16} style={{ color: child.current ? (brandData.primaryColor || '#0d6efd') : '#6c757d' }} />
                            ) : (
                              <div style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: child.current ? (brandData.primaryColor || '#0d6efd') : '#dee2e6'
                              }}></div>
                            )}
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    margin: '0 12px',
                    borderRadius: brandData.borderRadius || '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: item.current ? (brandData.primaryColor || '#0d6efd') : (brandData.textColor || '#495057'),
                    backgroundColor: item.current ? `${brandData.primaryColor || '#0d6efd'}20` : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    border: item.current ? `1px solid ${brandData.primaryColor || '#0d6efd'}40` : '1px solid transparent'
                  }}
                  onClick={() => (isMobile || isTablet) && closeSidebar()}
                  onMouseOver={(e) => {
                    if (!item.current) {
                      e.target.style.backgroundColor = brandData.backgroundColor || '#f8f9fa';
                      e.target.style.color = brandData.textColor || '#212529';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!item.current) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = brandData.textColor || '#495057';
                    }
                  }}
                >
                  <Icon size={18} style={{ 
                    color: item.current ? (brandData.primaryColor || '#0d6efd') : (brandData.secondaryColor || '#6c757d')
                  }} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          borderTop: '1px solid #dee2e6'
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#dc3545',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </div>      {/* Main Content */}
      <div 
        className={`content-transition ${(isMobile || isTablet) ? 'main-content-mobile' : 'main-content-desktop'}`}
        style={{ 
          marginLeft: (!isMobile && !isTablet && sidebarOpen) ? '256px' : '0',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh'
        }}
      >
        {/* Top Navigation */}
        <div style={{
          height: '60px',
          backgroundColor: 'white',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>          {/* Menu toggle button - always visible */}
          <button
            id="menu-button"
            className="btn-hover focus-ring"
            onClick={handleToggleSidebar}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#6c757d',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            aria-label="Toggle sidebar"
          >
            {/* Hamburger Menu Icon */}
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* Notifications */}
            <button style={{
              position: 'relative',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#6c757d',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <Bell size={18} />
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                backgroundColor: '#dc3545',
                borderRadius: '50%'
              }}></div>
            </button>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0d6efd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div style={{ 
                  display: (isMobile || isTablet) ? 'none' : 'block',
                  textAlign: 'left'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#212529',
                    lineHeight: '1.2'
                  }}>
                    {user?.name || 'Pengguna'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6c757d',
                    lineHeight: '1.2'
                  }}>
                    {user?.role === 'admin' || user?.role === 'Admin' ? 'Administrator' : 
                     user?.role === 'resepsionis' || user?.role === 'Resepsionis' || user?.role === 'receptionist' || user?.role === 'Receptionist' ? 'Resepsionis' : 
                     user?.role || 'Admin'}
                  </div>
                </div>
                <ChevronDown size={14} style={{ color: '#6c757d' }} />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  minWidth: '180px',
                  backgroundColor: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                  zIndex: 50
                }}>
                  <div style={{ padding: '8px 0' }}>
                    <Link
                      to="/app/profile"
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: '#212529',
                        textDecoration: 'none',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => setUserMenuOpen(false)}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Profil
                    </Link>
                    <Link
                      to="/app/settings"
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: '#212529',
                        textDecoration: 'none',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => setUserMenuOpen(false)}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Pengaturan
                    </Link>
                    <hr style={{ 
                      margin: '8px 0', 
                      border: 'none', 
                      borderTop: '1px solid #dee2e6' 
                    }} />
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: '#dc3545',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>        {/* Main content */}
        <main style={{
          padding: isMobile ? '16px' : isTablet ? '20px' : '24px',
          backgroundColor: '#f8f9fa'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
