import React from 'react';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const TournamentDetailsForm = ({ formData, onChange, errors }) => {
  const handleInputChange = (field, value) => {
    onChange(field, value);
  };

  return (
    <div className="glass-card p-8 mb-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Icon name="Trophy" size={20} color="white" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">
            Tournament Details
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure basic tournament information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <Input
            label="Tournament Name"
            type="text"
            placeholder="Enter tournament name (e.g., Winter Championship 2025)"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            required
            className="glow-focus"
          />
        </div>

        <Input
          label="Venue"
          type="text"
          placeholder="Tournament location"
          value={formData.venue}
          onChange={(e) => handleInputChange('venue', e.target.value)}
          error={errors.venue}
          required
          className="glow-focus"
        />

        <Input
          label="Tournament Date"
          type="date"
          value={formData.date}
          onChange={(e) => handleInputChange('date', e.target.value)}
          error={errors.date}
          required
          className="glow-focus"
        />
      </div>
    </div>
  );
};

export default TournamentDetailsForm;