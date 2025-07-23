import React from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';

const PlayerStatsModal = ({ player, results, onClose }) => {
  if (!player) return null;

  const playerResults = results
    .filter(r => r.player1_name === player.name || r.player2_name === player.name)
    .sort((a, b) => a.round - b.round);

  const stats = {
    highScore: Math.max(0, ...playerResults.map(r => r.player1_name === player.name ? r.score1 : r.score2)),
    lowScore: Math.min(Infinity, ...playerResults.map(r => r.player1_name === player.name ? r.score1 : r.score2)),
    avgScore: playerResults.length > 0 ? Math.round(playerResults.reduce((acc, r) => acc + (r.player1_name === player.name ? r.score1 : r.score2), 0) / playerResults.length) : 0,
    avgOpponentRating: 'N/A'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl mx-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-foreground">{player.name}</h2>
            <p className="text-muted-foreground">Rank: <span className="text-primary font-bold">{player.rank}</span> • Record: <span className="text-primary font-bold">{player.wins}-{player.losses}</span> • Spread: <span className="font-bold text-primary">{player.spread > 0 ? '+' : ''}{player.spread}</span></p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><Icon name="X" /></Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
             <div className="p-4 bg-card text-center"><p className="text-xl font-bold">{stats.highScore}</p><p className="text-xs text-muted-foreground">High Score</p></div>
             <div className="p-4 bg-card text-center"><p className="text-xl font-bold">{stats.lowScore === Infinity ? 0 : stats.lowScore}</p><p className="text-xs text-muted-foreground">Low Score</p></div>
             <div className="p-4 bg-card text-center"><p className="text-xl font-bold">{stats.avgScore}</p><p className="text-xs text-muted-foreground">Avg Score</p></div>
             <div className="p-4 bg-card text-center"><p className="text-xl font-bold">{stats.avgOpponentRating}</p><p className="text-xs text-muted-foreground">Avg Opp Rating</p></div>
        </div>

        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <h3 className="font-semibold mb-3">Game History</h3>
          <div className="space-y-3">
            {playerResults.map(r => {
              const isPlayer1 = r.player1_name === player.name;
              const opponentName = isPlayer1 ? r.player2_name : r.player1_name;
              const playerScore = isPlayer1 ? r.score1 : r.score2;
              const opponentScore = isPlayer1 ? r.score2 : r.score1;
              const won = playerScore > opponentScore;

              return (
                <div key={r.id} className="p-3 bg-muted/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <Icon name={won ? "TrendingUp" : "TrendingDown"} className={won ? "text-success" : "text-destructive"} />
                     <div>
                        <p className="text-sm text-muted-foreground">vs {opponentName} (Round {r.round})</p>
                        <p className="font-mono text-lg">{playerScore} - {opponentScore}</p>
                     </div>
                  </div>
                  <div className={`font-semibold px-2 py-1 rounded text-xs ${won ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {won ? `WIN (+${playerScore - opponentScore})` : `LOSS (${playerScore - opponentScore})`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal;