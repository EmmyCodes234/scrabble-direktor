import React, { useState, useRef } from 'react';

import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const PlayerRosterManager = ({ formData, onChange, errors }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Helper to parse players with ratings
  const parsePlayerLines = (lines) => {
    return lines.map(line => {
      const parts = line.split(',');
      const name = parts[0]?.trim();
      const rating = parseInt(parts[1]?.trim(), 10) || 0;
      if (!name) return null;
      return { name, rating };
    }).filter(Boolean); // Filter out any empty lines
  };

  const handleTextareaChange = (value) => {
    const lines = value.split('\n');
    const parsedPlayers = parsePlayerLines(lines);
    const playerNamesWithRatings = parsedPlayers.map(p => `${p.name}, ${p.rating}`).join('\n');
    
    onChange('playerNames', playerNamesWithRatings); // Store raw text
    onChange('playerCount', parsedPlayers.length);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n').slice(file.type === 'text/csv' ? 1 : 0); // Skip header for official CSV
      const parsedPlayers = parsePlayerLines(lines);
      const playerText = parsedPlayers.map(p => `${p.name}, ${p.rating}`).join('\n');

      onChange('playerNames', playerText);
      onChange('playerCount', parsedPlayers.length);
    };
    reader.readAsText(file);
  };
  
  const clearPlayers = () => {
    onChange('playerNames', '');
    onChange('playerCount', 0);
  };
  
  const addSamplePlayers = () => {
    const samplePlayers = `Alice Johnson, 1500
Bob Smith, 1250
Carol Davis, 1800
David Wilson, 0
Emma Brown, 1620
Frank Miller, 1400
Grace Taylor, 1330
Henry Anderson, 1950
Ivy Thompson, 1100
Jack Martinez, 1770`;
    handleTextareaChange(samplePlayers);
  };

  return (
    <div className="glass-card p-8 mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-success to-accent">
            <Icon name="Users" size={20} color="white" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-semibold text-foreground">
              Player Roster Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Add players and their ratings
            </p>
          </div>
        </div>
        
        {formData.playerCount > 0 && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-success/20 border border-success/30 rounded-full">
            <Icon name="Users" size={14} className="text-success" />
            <span className="text-sm font-medium text-success">
              {formData.playerCount} players
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manual Entry */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Player Names & Ratings
            <span className="text-destructive ml-1">*</span>
          </label>
          
          <textarea
            value={formData.playerNames}
            onChange={(e) => handleTextareaChange(e.target.value)}
            placeholder={`Enter one player per line in "Name, Rating" format:

Alice Johnson, 1500
Bob Smith, 1250
David Wilson, 0 (for unrated)`}
            className="w-full h-64 px-4 py-3 bg-input border border-border rounded-lg
                     text-foreground placeholder-muted-foreground resize-none
                     focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:outline-none
                     transition-all duration-200 font-mono text-sm"
          />
          
          {errors.playerNames && (
            <p className="mt-2 text-sm text-destructive flex items-center space-x-1">
              <Icon name="AlertCircle" size={14} />
              <span>{errors.playerNames}</span>
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
             <p className="text-xs text-muted-foreground">
              Format: Name, Rating (0 for unrated)
            </p>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addSamplePlayers}
                iconName="Plus"
                iconPosition="left"
              >
                Add Sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPlayers}
                iconName="Trash2"
                iconPosition="left"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* CSV Import */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            CSV Import
          </label>
          
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${dragActive 
                ? 'border-primary bg-primary/10' :'border-border hover:border-primary/50 hover:bg-muted/20'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/20">
                <Icon name="Upload" size={24} className="text-muted-foreground" />
              </div>
              
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Drop CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV format: Name in first column, Rating in second
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                iconName="FileText"
                iconPosition="left"
              >
                Choose File
              </Button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted/10 border border-border rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  CSV Format Requirements
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Column 1: Player Name</li>
                  <li>• Column 2: Player Rating (optional, defaults to 0)</li>
                  <li>• Header row will be automatically skipped</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerRosterManager;