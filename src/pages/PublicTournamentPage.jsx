import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Icon from 'components/AppIcon'; // Corrected Path
import { supabase } from 'supabaseClient'; // Corrected Path
import PlayerStatsModal from 'components/PlayerStatsModal'; // Corrected Path
import ResultSubmissionModal from 'components/ResultSubmissionModal'; // Corrected Path
import Button from 'components/ui/Button'; // Corrected Path
import { cn } from 'utils/cn'; // Corrected Path
import { Toaster } from 'sonner';

const PublicTournamentPage = () => {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState([]);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!tournamentId) {
        setLoading(false);
        return;
      }
      
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments').select('*').eq('id', tournamentId).single();
      
      if (tournamentError) console.error("Error fetching tournament", tournamentError);
      else setTournament(tournamentData);

      const { data: resultsData, error: resultsError } = await supabase
        .from('results').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true });

      if (resultsError) console.error("Error fetching results", resultsError);
      else setResults(resultsData);
      
      setLoading(false);
    };

    fetchPublicData();
    
    const channel = supabase
        .channel(`public-results-${tournamentId}`)
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'results', filter: `tournament_id=eq.${tournamentId}` },
          (payload) => {
              fetchPublicData();
              const updatedId = payload.new?.id || payload.old?.id;
              if (updatedId) {
                  setRecentlyUpdated(prev => [...prev, updatedId]);
                  setTimeout(() => setRecentlyUpdated(arr => arr.filter(id => id !== updatedId)), 2000);
              }
          }
        )
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel);
    };

  }, [tournamentId]);

  const tournamentStats = useMemo(() => {
    if (!results || results.length === 0) return { highGame: 0, highWin: 0 };
    let highGame = 0, highWin = 0;
    results.forEach(r => {
        if (r.score1 > highGame) highGame = r.score1;
        if (r.score2 > highGame) highGame = r.score2;
        const margin = Math.abs(r.score1 - r.score2);
        if (margin > highWin) highWin = margin;
    });
    return { highGame, highWin };
  }, [results]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading Tournament Portal...</p></div>;
  }
  
  if (!tournament) {
      return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
              <Icon name="SearchX" size={64} className="text-destructive opacity-50 mb-4" />
              <h1 className="text-2xl font-heading font-bold text-foreground">Tournament Not Found</h1>
          </div>
      );
  }

  const sortedPlayers = tournament.players ? [...tournament.players].sort((a,b) => a.rank - b.rank) : [];
  const totalRounds = tournament.rounds || 0;

  return (
    <>
      <Toaster position="top-center" richColors />
      <PlayerStatsModal 
        player={selectedPlayer} 
        results={results}
        onClose={() => setSelectedPlayer(null)}
      />
      {showSubmissionModal && (
        <ResultSubmissionModal
            tournament={tournament}
            players={sortedPlayers}
            onClose={() => setShowSubmissionModal(false)}
        />
      )}
      <div className="min-h-screen bg-background text-foreground">
        <header className="py-6 px-6 glass-card border-b border-border sticky top-0 z-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-gradient">{tournament.name}</h1>
                        <p className="text-muted-foreground">{tournament.venue} • {new Date(tournament.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                         <div className="flex items-center space-x-2 text-sm text-success justify-end">
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            <span>Live</span>
                        </div>
                        <p className="text-muted-foreground text-sm">Round {tournament.currentRound || 1} of {totalRounds}</p>
                    </div>
                </div>
            </div>
        </header>
        <main className="py-8 px-6">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4 flex items-center space-x-4"><Icon name="Zap" size={24} className="text-primary"/><div><p className="text-2xl font-bold font-mono">{tournamentStats.highGame}</p><p className="text-xs text-muted-foreground">High Game Score</p></div></div>
                    <div className="glass-card p-4 flex items-center space-x-4"><Icon name="ChevronsUp" size={24} className="text-success"/><div><p className="text-2xl font-bold font-mono">+{tournamentStats.highWin}</p><p className="text-xs text-muted-foreground">Largest Margin</p></div></div>
                    <div className="glass-card p-4 flex items-center space-x-4"><Icon name="Users" size={24} className="text-accent"/><div><p className="text-2xl font-bold font-mono">{tournament.playerCount}</p><p className="text-xs text-muted-foreground">Total Players</p></div></div>
                </div>

                {tournament.is_remote_submission_enabled && (
                    <div className="text-center">
                        <Button onClick={() => setShowSubmissionModal(true)} size="lg" className="shadow-glow">
                            <Icon name="Send" className="mr-2" />
                            Submit a Result
                        </Button>
                    </div>
                )}
                
                <div>
                    <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Trophy" className="mr-3 text-primary"/>Live Standings</h2>
                    <div className="glass-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/10">
                                        <th className="p-4 text-left font-semibold">Rank</th>
                                        <th className="p-4 text-left font-semibold">Player</th>
                                        <th className="p-4 text-center font-semibold">Record</th>
                                        <th className="p-4 text-right font-semibold">Spread</th>
                                        {[...Array(totalRounds)].map((_, i) => <th key={i} className="p-4 text-center font-semibold">R{i+1}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPlayers.map((p, pIndex) => (
                                        <tr key={p.id} className={cn("border-b border-border/50 hover:bg-muted/10 transition-colors duration-300 cursor-pointer", pIndex % 2 === 1 && "bg-muted/5")} onClick={() => setSelectedPlayer(p)}>
                                            <td className="p-4 font-mono text-lg">{p.rank}</td>
                                            <td className="p-4 font-medium text-base">{p.name}</td>
                                            <td className="p-4 text-center font-mono">{p.wins}-{p.losses}</td>
                                            <td className={cn("p-4 text-right font-mono font-semibold", p.spread >= 0 ? 'text-success' : 'text-destructive')}>{p.spread > 0 ? '+' : ''}{p.spread}</td>
                                            {[...Array(totalRounds)].map((_, rIndex) => {
                                                const round = rIndex + 1;
                                                const result = results.find(r => r.round === round && (r.player1_name === p.name || r.player2_name === p.name));
                                                if (!result) return <td key={rIndex} className="p-4 text-center font-mono text-muted-foreground">-</td>;
                                                const isPlayer1 = result.player1_name === p.name;
                                                const opponentName = isPlayer1 ? result.player2_name : result.player1_name;
                                                const opponent = sortedPlayers.find(op => op.name === opponentName);
                                                const won = isPlayer1 ? result.score1 > result.score2 : result.score2 > result.score1;
                                                return <td key={rIndex} className={cn("p-4 text-center font-mono", won ? 'text-success' : 'text-destructive', recentlyUpdated.includes(result.id) && 'flash-update')}><div className="text-xs">{opponent?.rank || '-'}</div><div>{isPlayer1 ? result.score1 : result.score2}</div></td>
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
      </div>
    </>
  );
};

export default PublicTournamentPage;