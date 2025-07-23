import React from 'react';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const RoundsConfiguration = ({ formData, onChange, errors }) => {
  const handleRoundsChange = (value) => {
    const rounds = parseInt(value) || 0;
    onChange('rounds', rounds);
  };

  const getRoundsValidation = () => {
    if (formData.rounds < 1) return "Minimum 1 round required";
    if (formData.rounds > 50) return "Maximum 50 rounds allowed";
    return "";
  };

  return (
    <div className="glass-card p-8 mb-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-primary">
          <Icon name="RotateCcw" size={20} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">
            Rounds Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Set the number of tournament rounds
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Number of Rounds"
          type="number"
          placeholder="Enter number of rounds"
          value={formData.rounds}
          onChange={(e) => handleRoundsChange(e.target.value)}
          error={errors.rounds || getRoundsValidation()}
          required
          min="1"
          max="50"
          className="glow-focus"
        />

        <div className="flex items-center space-x-4 p-4 glass-morphism rounded-lg">
          <Icon name="Info" size={20} className="text-accent" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Recommended: {formData.playerCount ? Math.ceil(formData.playerCount / 4) : '8-12'} rounds
            </p>
            <p className="text-xs text-muted-foreground">
              Based on tournament size and format
            </p>
          </div>
        </div>
      </div>

      {formData.rounds > 0 && (
        <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Clock" size={16} className="text-accent" />
            <span className="text-sm font-medium text-accent">
              Estimated Duration
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Approximately {Math.ceil(formData.rounds * 0.75)} hours
            ({formData.rounds} rounds × 45 min average)
          </p>
        </div>
      )}
    </div>
  );
};

export default RoundsConfiguration;