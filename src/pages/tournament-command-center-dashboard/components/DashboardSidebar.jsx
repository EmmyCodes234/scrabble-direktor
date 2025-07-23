import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tournamentId } = useParams();

  const navItems = [
    { label: 'Dashboard', path: `/tournament/${tournamentId}/dashboard`, icon: 'LayoutDashboard' },
    { label: 'Player Roster', path: `/tournament/${tournamentId}/players`, icon: 'Users' },
    { label: 'Pairings', path: `/tournament/${tournamentId}/pairings`, icon: 'Swords' },
    { label: 'Settings', path: `/tournament/${tournamentId}/settings`, icon: 'Settings' },
    { label: 'Reports', path: `/tournament/${tournamentId}/reports`, icon: 'FileText' },
  ];

  return (
    <aside className="md:col-span-1 md:sticky top-24 self-start">
      <div className="glass-card p-4 space-y-2">
        <h3 className="font-semibold px-2 text-muted-foreground text-sm">Manage Tournament</h3>
        
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className={cn(
                "w-full justify-start",
                location.pathname === item.path && "bg-primary/10 text-primary"
            )}
            onClick={() => navigate(item.path)}
          >
            <Icon name={item.icon} className="mr-2"/>
            {item.label}
          </Button>
        ))}
         <div className="border-t border-border pt-2 mt-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
              <Icon name="Home" className="mr-2"/>Lobby
            </Button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;