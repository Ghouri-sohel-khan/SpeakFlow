import React from 'react';
import { Home, Map, Mic, BarChart2, Lock } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'journey', label: 'Journey', icon: Map },
    { id: 'diary', label: 'Diary', icon: Mic },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'achievements', label: 'Vault', icon: Lock }
  ];

  return (
    <nav className="bottom-navbar">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ position: 'relative' }}
          >
            <div className="nav-item-icon-wrapper">
              <IconComponent size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
export default Navbar;
