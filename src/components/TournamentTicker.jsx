import React from 'react';
import Icon from './AppIcon';
import 'styles/ticker.css'; // We will create this next

const TournamentTicker = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return null; // Don't render if there are no messages
  }

  return (
    <div className="ticker-wrap glass-card">
      <div className="ticker">
        {messages.map((msg, i) => (
          <div className="ticker__item" key={i}>
            <Icon name="Zap" size={14} className="text-primary mr-2" />
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentTicker;