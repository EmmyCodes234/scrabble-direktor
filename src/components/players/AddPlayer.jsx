import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';

const AddPlayer = ({ onAddPlayer }) => {
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      onAddPlayer(playerName.trim());
      setPlayerName('');
    }
  };

  return (
    <div className="glass-card p-6 mb-6">
      <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center">
        <Icon name="UserPlus" size={20} className="mr-2 text-primary" />
        Add New Player
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Player Name"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter player's full name"
        />
        <Button
          type="submit"
          disabled={!playerName.trim()}
          iconName="PlusCircle"
          iconPosition="left"
          className="w-full"
        >
          Add to Roster
        </Button>
      </form>
    </div>
  );
};

export default AddPlayer;