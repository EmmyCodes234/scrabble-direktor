import React, { useRef, useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Input from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import Button from '../ui/Button';

const TournamentConfigSection = ({ settings, onSettingsChange, onBannerFileChange }) => {
  const bannerInputRef = useRef(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  useEffect(() => {
    setBannerPreview(settings.banner_url);
  }, [settings.banner_url]);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
      onBannerFileChange(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
          <Icon name="Image" size={20} className="text-primary" />
          <span>Tournament Banner</span>
        </h3>
        <div className="w-full aspect-[4/1] bg-muted/20 rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-border">
            {bannerPreview ? (
                <img src={bannerPreview} alt="Tournament Banner" className="w-full h-full object-cover"/>
            ) : (
                <p className="text-muted-foreground text-sm">No banner uploaded</p>
            )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          For best results, use a wide, panoramic image (e.g., 1200 x 300 pixels).
        </p>
        <input 
          type="file" 
          ref={bannerInputRef} 
          onChange={handleBannerChange} 
          accept="image/png, image/jpeg, image/gif" 
          className="hidden" 
        />
        <Button variant="outline" onClick={() => bannerInputRef.current.click()}>
            <Icon name="UploadCloud" size={16} className="mr-2"/>
            {settings.banner_url ? 'Change Banner' : 'Upload Banner'}
        </Button>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
          <Icon name="Info" size={20} className="text-primary" />
          <span>Basic Information</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tournament Name"
            type="text"
            value={settings.name || ''}
            onChange={(e) => onSettingsChange('name', e.target.value)}
          />
          <Input
            label="Venue"
            type="text"
            value={settings.venue || ''}
            onChange={(e) => onSettingsChange('venue', e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={settings.date || ''}
            onChange={(e) => onSettingsChange('date', e.target.value)}
          />
           <Input
            label="Total Rounds"
            type="number"
            value={settings.rounds || 0}
            onChange={(e) => onSettingsChange('rounds', parseInt(e.target.value, 10))}
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
          checked={settings.is_remote_submission_enabled || false}
          onCheckedChange={(checked) => onSettingsChange('is_remote_submission_enabled', checked)}
          description="Allow players to submit scores from the public page for director approval."
        />
      </div>
    </div>
  );
};
export default TournamentConfigSection;