import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const StandingsTable = ({ players, recentResults }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special handling for rank (lower is better)
      if (sortConfig.key === 'rank') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Special handling for spread (numeric)
      if (sortConfig.key === 'spread') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison for names
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [players, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <Icon name="ArrowUpDown" size={14} className="text-muted-foreground/50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <Icon name="ArrowUp" size={14} className="text-primary" />
      : <Icon name="ArrowDown" size={14} className="text-primary" />;
  };

  const getLastGameStatus = (player) => {
    const lastResult = recentResults
      .filter(r => r.player1 === player.name || r.player2 === player.name)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!lastResult) {
      return { status: 'waiting', text: 'No games', color: 'text-muted-foreground' };
    }

    const isWinner = (lastResult.player1 === player.name && lastResult.score1 > lastResult.score2) ||
                     (lastResult.player2 === player.name && lastResult.score2 > lastResult.score1);

    const timeDiff = Date.now() - new Date(lastResult.timestamp).getTime();
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));

    return {
      status: isWinner ? 'won' : 'lost',
      text: `${isWinner ? 'Won' : 'Lost'} ${minutesAgo}m ago`,
      color: isWinner ? 'text-success' : 'text-destructive'
    };
  };

  const renderWinLossRecord = (player) => {
    const wins = Array.from({ length: player.wins }, (_, i) => (
      <span key={`w-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/20 text-success text-xs font-mono font-medium">
        W
      </span>
    ));

    const losses = Array.from({ length: player.losses }, (_, i) => (
      <span key={`l-${i}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive/20 text-destructive text-xs font-mono font-medium">
        L
      </span>
    ));

    return (
      <div className="flex items-center space-x-1 flex-wrap">
        {wins}
        {losses}
      </div>
    );
  };

  // Mobile-First Responsive Table View
  const ResponsiveTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 sm:p-4">
              <button
                onClick={() => handleSort('rank')}
                className="flex items-center space-x-2 font-heading font-semibold text-foreground hover:text-primary transition-colors touch-target"
              >
                <span>Rank</span>
                {getSortIcon('rank')}
              </button>
            </th>
            <th className="text-left p-3 sm:p-4">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center space-x-2 font-heading font-semibold text-foreground hover:text-primary transition-colors touch-target"
              >
                <span>Player</span>
                {getSortIcon('name')}
              </button>
            </th>
            <th className="text-left p-3 sm:p-4">
              <span className="font-heading font-semibold text-foreground">Record</span>
            </th>
            {/* Show spread on tablet+ */}
            <th className="hidden md:table-cell text-right p-3 sm:p-4">
              <button
                onClick={() => handleSort('spread')}
                className="flex items-center space-x-2 font-heading font-semibold text-foreground hover:text-primary transition-colors ml-auto touch-target"
              >
                <span>Spread</span>
                {getSortIcon('spread')}
              </button>
            </th>
            {/* Show last game on large screens */}
            <th className="hidden lg:table-cell text-left p-3 sm:p-4">
              <span className="font-heading font-semibold text-foreground">Last Game</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player, index) => {
            const lastGame = getLastGameStatus(player);
            return (
              <tr
                key={player.id}
                className="border-b border-border/50 hover:bg-muted/5 transition-colors group touch-target"
              >
                <td className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-semibold text-base sm:text-lg text-right min-w-[2rem]">
                      {player.rank}
                    </span>
                    {player.rank <= 3 && (
                      <Icon 
                        name="Trophy" 
                        size={16} 
                        className={
                          player.rank === 1 ? 'text-warning' :
                          player.rank === 2 ? 'text-muted-foreground': 'text-amber-600'
                        } 
                      />
                    )}
                  </div>
                </td>
                <td className="p-3 sm:p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-mono text-sm font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground text-sm sm:text-base truncate block">
                        {player.name}
                      </span>
                      {/* Mobile: Show spread inline */}
                      <div className="md:hidden text-xs text-muted-foreground">
                        <span className={`font-mono font-semibold ${
                          player.spread > 0 ? 'text-success' : 
                          player.spread < 0 ? 'text-destructive': 'text-muted-foreground'
                        }`}>
                          {player.spread > 0 ? '+' : ''}{player.spread}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 sm:p-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      {renderWinLossRecord(player)}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                      {player.wins}-{player.losses}
                    </span>
                    {/* Mobile: Show last game status */}
                    <div className="lg:hidden">
                      <span className={`text-xs ${lastGame.color}`}>
                        {lastGame.text}
                      </span>
                    </div>
                  </div>
                </td>
                {/* Tablet+ Spread Column */}
                <td className="hidden md:table-cell p-3 sm:p-4 text-right">
                  <span className={`font-mono font-semibold text-base sm:text-lg ${
                    player.spread > 0 ? 'text-success' : 
                    player.spread < 0 ? 'text-destructive': 'text-muted-foreground'
                  }`}>
                    {player.spread > 0 ? '+' : ''}{player.spread}
                  </span>
                </td>
                {/* Large Screen Last Game Column */}
                <td className="hidden lg:table-cell p-3 sm:p-4">
                  <span className={`text-sm ${lastGame.color}`}>
                    {lastGame.text}
                  </span>
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
          <div key={player.id} className="backdrop-blur-lg bg-surface/80 border border-border rounded-lg p-4 hover:shadow-glow hover:border-primary/30 transition-smooth touch-target">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold text-xl text-primary">
                    #{player.rank}
                  </span>
                  {player.rank <= 3 && (
                    <Icon 
                      name="Trophy" 
                      size={16} 
                      className={
                        player.rank === 1 ? 'text-warning' :
                        player.rank === 2 ? 'text-muted-foreground': 'text-amber-600'
                      } 
                    />
                  )}
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-foreground">{player.name}</div>
                  <div className="text-sm text-muted-foreground">{player.wins}-{player.losses}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-semibold text-lg ${
                  player.spread > 0 ? 'text-success' : 
                  player.spread < 0 ? 'text-destructive': 'text-muted-foreground'
                }`}>
                  {player.spread > 0 ? '+' : ''}{player.spread}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {renderWinLossRecord(player)}
              </div>
              <span className={`text-sm ${lastGame.color}`}>
                {lastGame.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="backdrop-blur-lg bg-card/80 h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-success/20">
            <Icon name="Trophy" size={16} className="text-success" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">Live Standings</h3>
            <p className="text-xs text-muted-foreground">Real-time tournament rankings</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-1 backdrop-blur-md bg-muted/20 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('table')}
              iconName="Table"
              iconSize={14}
              className="touch-target"
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setViewMode('cards')}
              iconName="Grid3X3"
              iconSize={14}
              className="touch-target"
            >
              Cards
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-glow" />
            <span className="font-mono">LIVE</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Icon name="Trophy" size={48} className="mb-4 opacity-50" />
            <h4 className="font-heading font-semibold mb-2">No Players Yet</h4>
            <p className="text-sm text-center px-4">
              Add players to see the tournament standings
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Always show responsive table */}
            <div className="md:hidden">
              <ResponsiveTableView />
            </div>
            {/* Desktop: Show selected view mode */}
            <div className="hidden md:block">
              {viewMode === 'table' ? <ResponsiveTableView /> : <CardView />}
            </div>
          </>
        )}
      </div>

      {players.length > 0 && (
        <div className="p-4 border-t border-border backdrop-blur-lg bg-surface/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 text-xs text-muted-foreground">
            <span>Updated: {new Date().toLocaleTimeString()}</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Icon name="Users" size={12} />
                <span>{players.length} players</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Gamepad2" size={12} />
                <span>{recentResults.length} games</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandingsTable;