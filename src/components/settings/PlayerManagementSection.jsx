import React, { useState } from 'react';
import Icon from '../AppIcon';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';

const PlayerManagementSection = () => {
  const [settings, setSettings] = useState({
    maxPlayers: 64,
    allowLateEntry: true,
    lateEntryDeadline: 3,
  });

  return (
    <div className="glass-card p-6">
      <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
        <Icon name="Users" size={20} className="text-primary" />
        <span>Player Management Policies</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <Input
              label="Maximum Players"
              type="number"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({...settings, maxPlayers: e.target.value})}
              description="Max players allowed in the tournament."
            />
        </div>
        <div className="space-y-4">
            <Checkbox
              label="Allow Late Entry"
              checked={settings.allowLateEntry}
              onCheckedChange={(checked) => setSettings({...settings, allowLateEntry: checked})}
              description="Allow players to join after the tournament starts."
            />
            {settings.allowLateEntry && (
              <Input
                label="Late Entry Deadline (Rounds)"
                type="number"
                value={settings.lateEntryDeadline}
                onChange={(e) => setSettings({...settings, lateEntryDeadline: e.target.value})}
                className="ml-6"
              />
            )}
        </div>
      </div>
    </div>
  );
};
export default PlayerManagementSection;