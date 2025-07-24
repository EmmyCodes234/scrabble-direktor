import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

const StandingsTable = ({ players, recentResults, tournamentState }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

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
    const timeAgo = Math.floor((Date.now() - new Date(lastResult.created_at).getTime()) / 60000);

    if (isDraw) return { text: `Drew ${timeAgo}m ago`, color: 'text-muted-foreground' };

    return {
      text: `${isWinner ? 'Won' : 'Lost'} ${timeAgo}m ago`,
      color: isWinner ? 'text-success' : 'text-destructive'
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

  const ResponsiveTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 sm:p-4 font-semibold text-foreground">Rank</th>
            <th className="text-left p-3 sm:p-4 font-semibold text-foreground">Player</th>
            <th className="text-left p-3 sm:p-4 font-semibold text-foreground">Record</th>
            <th className="hidden md:table-cell text-right p-3 sm:p-4 font-semibold text-foreground">Spread</th>
            <th className="hidden lg:table-cell text-left p-3 sm:p-4 font-semibold text-foreground">Last Game</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => {
            const lastGame = getLastGameStatus(player);
            return (
              <tr key={player.id} className="border-b border-border/50 hover:bg-muted/5 transition-colors group touch-target">
                <td className="p-3 sm:p-4"><span className="font-mono font-semibold text-base sm:text-lg">{player.rank}</span></td>
                <td className="p-3 sm:p-4"><span className="font-medium text-foreground text-sm sm:text-base">{player.name}</span></td>
                <td className="p-3 sm:p-4"><span className="text-xs sm:text-sm text-muted-foreground font-mono">{player.wins || 0}-{player.losses || 0}{(player.ties || 0) > 0 ? `-${player.ties}` : ''}</span></td>
                <td className="hidden md:table-cell p-3 sm:p-4 text-right"><span className={`font-mono font-semibold text-base sm:text-lg ${player.spread > 0 ? 'text-success' : player.spread < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{player.spread > 0 ? '+' : ''}{player.spread}</span></td>
                <td className="hidden lg:table-cell p-3 sm:p-4"><span className={`text-sm ${lastGame.color}`}>{lastGame.text}</span></td>
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
              <div className="text-right"><div className={`font-mono font-semibold text-lg ${player.spread > 0 ? 'text-success' : player.spread < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{player.spread > 0 ? '+' : ''}{player.spread}</div></div>
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
        <div className="hidden md:flex items-center space-x-1 bg-muted/20 rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="xs" onClick={() => setViewMode('table')}>Table</Button>
            <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="xs" onClick={() => setViewMode('cards')}>Cards</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <h4 className="font-heading font-semibold mb-2">No Players Yet</h4>
          </div>
        ) : (
          <>
            <div className="md:hidden"><ResponsiveTableView /></div>
            <div className="hidden md:block">{viewMode === 'table' ? <ResponsiveTableView /> : <CardView />}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default StandingsTable;