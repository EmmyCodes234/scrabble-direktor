import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

const StandingsTable = ({ players, recentResults }) => {
  const [viewMode, setViewMode] = useState('table');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    // The parent component is now responsible for ranking, so we just sort by rank
    return [...players].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [players]);

  const getLastGameStatus = (player) => {
    if (!recentResults || recentResults.length === 0) return { text: 'No games' };
    
    const lastResult = recentResults
      .filter(r => r.player1_name === player.name || r.player2_name === player.name)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!lastResult) return { text: 'No games' };

    const isWinner = (lastResult.player1_name === player.name && lastResult.score1 > lastResult.score2) ||
                     (lastResult.player2_name === player.name && lastResult.score2 > lastResult.score1);
    
    const isDraw = lastResult.score1 === lastResult.score2;
    const timeAgo = Math.round((Date.now() - new Date(lastResult.created_at).getTime()) / 60000);
    
    if (timeAgo < 1) return { text: 'Just now', color: isDraw ? 'text-muted-foreground' : (isWinner ? 'text-success' : 'text-destructive') };

    const resultText = isDraw ? 'Drew' : (isWinner ? 'Won' : 'Lost');
    return {
      text: `${resultText} ${timeAgo}m ago`,
      color: isDraw ? 'text-muted-foreground' : (isWinner ? 'text-success' : 'text-destructive')
    };
  };

  const renderWinLossRecord = (player) => {
    const wins = Array.from({ length: Math.floor(player.wins || 0) }, (_, i) => (
      <span key={`w-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/20 text-success text-xs font-mono font-medium">W</span>
    ));
    const losses = Array.from({ length: player.losses || 0 }, (_, i) => (
      <span key={`l-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive/20 text-destructive text-xs font-mono font-medium">L</span>
    ));
    const ties = Array.from({ length: player.ties || 0 }, (_, i) => (
      <span key={`t-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning/20 text-warning text-xs font-mono font-medium">D</span>
    ));
    return <div className="flex items-center space-x-1 flex-wrap">{wins}{losses}{ties}</div>;
  };

  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-4 w-[10%] text-left font-semibold text-foreground">Rank</th>
            <th className="p-4 w-[40%] text-left font-semibold text-foreground">Player</th>
            <th className="p-4 w-[15%] text-center font-semibold text-foreground">Record</th>
            <th className="p-4 w-[15%] text-center font-semibold text-foreground">Spread</th>
            <th className="p-4 w-[20%] text-center font-semibold text-foreground">Last Game</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => {
            const lastGame = getLastGameStatus(player);
            return (
              <tr key={player.id} className="border-b border-border/50 hover:bg-muted/5 transition-colors group">
                <td className="p-4 font-mono font-bold text-lg text-primary">{player.rank}</td>
                <td className="p-4 font-medium text-foreground">{player.name}</td>
                <td className="p-4 text-center font-mono">{player.wins || 0}-{player.losses || 0}{(player.ties || 0) > 0 ? `-${player.ties}` : ''}</td>
                <td className={`p-4 text-center font-mono font-semibold ${player.spread > 0 ? 'text-success' : player.spread < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {player.spread > 0 ? '+' : ''}{player.spread || 0}
                </td>
                <td className={`p-4 text-center text-xs ${lastGame.color}`}>
                  {lastGame.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const CardView = () => (
    <div className="grid gap-4 p-4">
      {sortedPlayers.map((player) => {
        const lastGame = getLastGameStatus(player);
        return (
          <div key={player.id} className="glass-card p-4 hover:shadow-glow hover:border-primary/30 transition-smooth touch-target">
            <div className="flex items-center justify-between mb-3">
              <div><span className="font-mono font-semibold text-xl text-primary">#{player.rank}</span></div>
              <div className="text-right"><div className={`font-mono font-semibold text-lg ${player.spread > 0 ? 'text-success' : player.spread < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{player.spread > 0 ? '+' : ''}{player.spread || 0}</div></div>
            </div>
            <div className="font-medium text-foreground">{player.name}</div>
            <div className="text-sm text-muted-foreground">{player.wins || 0}-{player.losses || 0}{(player.ties || 0) > 0 ? `-${player.ties}` : ''}</div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">{renderWinLossRecord(player)}</div>
              <span className={`text-sm ${lastGame.color}`}>{lastGame.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-foreground">Live Standings</h3>
        {isDesktop && (
            <div className="flex items-center space-x-1 bg-muted/20 rounded-lg p-1">
                <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="xs" onClick={() => setViewMode('table')}>Table</Button>
                <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="xs" onClick={() => setViewMode('cards')}>Cards</Button>
            </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Icon name="Users" size={48} className="opacity-50 mb-4" />
            <h4 className="font-heading font-semibold text-lg">No Players in Roster</h4>
            <p className="text-sm">Add players to begin the tournament.</p>
          </div>
        ) : (
          isDesktop ? (viewMode === 'table' ? <TableView /> : <CardView />) : <CardView />
        )}
      </div>
    </div>
  );
};

export default StandingsTable;