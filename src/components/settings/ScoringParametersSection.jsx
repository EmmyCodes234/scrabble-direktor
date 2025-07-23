import React, { useState } from 'react';
import Icon from '../AppIcon';
import Input from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';

const ScoringParametersSection = () => {
  const [settings, setSettings] = useState({
    winPoints: 1,
    lossPoints: 0,
    tiePoints: 0.5,
    spreadTiebreaker: true,
  });

  return (
    <div className="glass-card p-6">
      <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
        <Icon name="Trophy" size={20} className="text-primary" />
        <span>Scoring & Tiebreakers</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Input
          label="Win Points"
          type="number"
          value={settings.winPoints}
          onChange={(e) => setSettings({...settings, winPoints: e.target.value})}
        />
        <Input
          label="Loss Points"
          type="number"
          value={settings.lossPoints}
          onChange={(e) => setSettings({...settings, lossPoints: e.target.value})}
        />
        <Input
          label="Tie Points"
          type="number"
          value={settings.tiePoints}
          onChange={(e) => setSettings({...settings, tiePoints: e.target.value})}
        />
      </div>
       <Checkbox
          label="Use Spread as Primary Tiebreaker"
          checked={settings.spreadTiebreaker}
          onCheckedChange={(checked) => setSettings({...settings, spreadTiebreaker: checked})}
          description="Use point spread to break ties between players with equal wins."
        />
    </div>
  );
};
export default ScoringParametersSection;