import React from 'react';
import { Home, Map, Mic, BarChart2, Trophy } from 'lucide-react';

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
    { id: 'achievements', label: 'Badges', icon: Trophy }
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
          >
            <div className="nav-item-icon-wrapper">
              <IconComponent size={20} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
export default Navbar;
