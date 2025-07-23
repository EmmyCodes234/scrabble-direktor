import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';

const TournamentConfigSection = ({ tournament, setHasUnsavedChanges }) => {
  const [config, setConfig] = useState({
    name: "",
    venue: "",
    date: "",
    totalRounds: 0,
    is_remote_submission_enabled: false,
  });

  useEffect(() => {
    if (tournament) {
      setConfig({
        name: tournament.name || "",
        venue: tournament.venue || "",
        date: tournament.date || "",
        totalRounds: tournament.rounds || 0,
        is_remote_submission_enabled: tournament.is_remote_submission_enabled || false,
      });
    }
  }, [tournament]);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
          <Icon name="Info" size={20} className="text-primary" />
          <span>Basic Information</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tournament Name"
            type="text"
            value={config.name}
            onChange={(e) => handleConfigChange('name', e.target.value)}
          />
          <Input
            label="Venue"
            type="text"
            value={config.venue}
            onChange={(e) => handleConfigChange('venue', e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={config.date}
            onChange={(e) => handleConfigChange('date', e.target.value)}
          />
           <Input
            label="Total Rounds"
            type="number"
            value={config.totalRounds}
            onChange={(e) => handleConfigChange('totalRounds', parseInt(e.target.value, 10))}
          />
        </div>
      </div>
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
          <Icon name="Shield" size={20} className="text-primary" />
          <span>Permissions</span>
        </h3>
        <Checkbox
          label="Enable Remote Score Submission"
          checked={config.is_remote_submission_enabled}
          onCheckedChange={(checked) => handleConfigChange('is_remote_submission_enabled', checked)}
          description="Allow players to submit scores from the public page for director approval."
        />
      </div>
    </div>
  );
};
export default TournamentConfigSection;