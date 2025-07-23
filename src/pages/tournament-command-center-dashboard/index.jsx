import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentStats from './components/TournamentStats';
import TournamentControl from './components/TournamentControl';
import PendingResults from './components/PendingResults';
import StandingsTable from './components/StandingsTable';
import ResultsTerminal from './components/ResultsTerminal';
import { Toaster, toast } from 'sonner';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { supabase } from '../../supabaseClient';
import DashboardSidebar from './components/DashboardSidebar';

const TournamentCommandCenterDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { tournamentId } = useParams();

  const fetchTournamentData = async () => {
    if (!tournamentId) {
      setIsLoading(false);
      setTournamentInfo(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      if (error || !data) {
        throw error || new Error("Tournament not found");
      }
      setTournamentInfo(data);
      setPlayers(data.players || []);
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });
      if (resultsError) {
        toast.error("Failed to load results.");
      } else {
        setRecentResults(resultsData || []);
      }
    } catch (error) {
        console.error("Error fetching tournament:", error);
        setTournamentInfo(null);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTournamentData();
  }, [tournamentId]);
  
  const handleRoundPaired = (updatedTournamentInfo) => {
    setTournamentInfo(updatedTournamentInfo);
  };

  const updateTournamentPlayers = async (newPlayers) => {
    const { error } = await supabase
      .from('tournaments')
      .update({ players: newPlayers, "playerCount": newPlayers.length })
      .eq('id', tournamentId);
    if (error) toast.error("Failed to update player list.");
    else setPlayers(newPlayers);
  };

  const handleResultSubmit = async (result, pendingResultId = null) => {
    const currentRound = tournamentInfo.currentRound || 1;
    const newResultEntry = {
      tournament_id: tournamentId,
      round: currentRound,
      player1_name: result.player1,
      player2_name: result.player2,
      score1: result.score1,
      score2: result.score2,
    };
    const { error: insertError } = await supabase.from('results').insert([newResultEntry]);
    if (insertError) {
      toast.error("Failed to record result.");
      return Promise.reject(insertError);
    }
    const updatedPlayers = players.map(player => {
      if (player.name === result.player1) {
        const won = result.score1 > result.score2;
        return { ...player, wins: (player.wins || 0) + (won ? 1 : 0), losses: (player.losses || 0) + (won ? 0 : 1), spread: (player.spread || 0) + (result.score1 - result.score2) };
      }
      if (player.name === result.player2) {
        const won = result.score2 > result.score1;
        return { ...player, wins: (player.wins || 0) + (won ? 1 : 0), losses: (player.losses || 0) + (won ? 0 : 1), spread: (player.spread || 0) + (result.score2 - result.score1) };
      }
      return player;
    });
    await updateTournamentPlayers(updatedPlayers);
    if (pendingResultId) {
      await supabase.from('pending_results').delete().eq('id', pendingResultId);
    }
    await fetchTournamentData();
    toast.success(`Result recorded: ${result.player1} ${result.score1} - ${result.score2} ${result.player2}`);
    return Promise.resolve();
  };

  const handleApproveResult = (pendingResult) => {
    const result = { player1: pendingResult.player1_name, player2: pendingResult.player2_name, score1: pendingResult.score1, score2: pendingResult.score2 };
    handleResultSubmit(result, pendingResult.id);
  };

  const handleCompleteRound = async () => {
    const currentRound = tournamentInfo.currentRound || 1;
    const nextRound = currentRound + 1;
    
    if (nextRound > tournamentInfo.rounds) {
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
        fetchTournamentData();
        toast.success("Final round complete! Tournament finished.");
        return;
    }

    const { data, error } = await supabase
        .from('tournaments')
        .update({ currentRound: nextRound })
        .eq('id', tournamentId)
        .select()
        .single();
    
    if (error) {
        toast.error("Failed to advance to the next round.");
    } else {
        toast.success(`Round ${currentRound} complete. Proceeding to Round ${nextRound}.`);
        setTournamentInfo(data);
    }
  };
  
  const getTournamentState = () => {
      if (!tournamentInfo) return 'NO_TOURNAMENT';
      if (tournamentInfo.status === 'completed') return 'TOURNAMENT_COMPLETE';
      const currentRound = tournamentInfo.currentRound || 1;
      const pairingsForCurrentRound = tournamentInfo.pairing_schedule ? tournamentInfo.pairing_schedule[currentRound] : null;
      
      if (pairingsForCurrentRound) {
          const resultsForCurrentRound = recentResults.filter(r => r.round === currentRound);
          const expectedResults = pairingsForCurrentRound.filter(p => p.table !== 'BYE').length;
          if (resultsForCurrentRound.length >= expectedResults) {
              return 'ROUND_COMPLETE';
          }
          return 'ROUND_IN_PROGRESS';
      }
      
      if ((tournamentInfo.players || []).length >= 2) return 'ROSTER_READY';
      
      return 'EMPTY_ROSTER';
  };

  const tournamentState = getTournamentState();
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-background">
            <Header/>
            <main className="pt-20 pb-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <DashboardSidebar />
                        <div className="md:col-span-3">
                            <p className="text-muted-foreground text-center p-12">Loading Tournament...</p>
                        </div>
                     </div>
                 </div>
            </main>
        </div>
    );
  }

  if (!tournamentInfo) {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Icon name="AlertTriangle" size={64} className="text-destructive opacity-50 mb-4" />
                <h1 className="text-2xl font-heading font-bold text-foreground">Tournament Not Found</h1>
                <Button onClick={() => navigate('/')}>
                    Go to Tournament Lobby
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <DashboardSidebar />
                <div className="md:col-span-3 space-y-6">
                    <motion.div variants={itemVariants}>
                        <TournamentStats 
                          players={players}
                          recentResults={recentResults}
                          tournamentInfo={tournamentInfo}
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        {tournamentState === 'EMPTY_ROSTER' && (
                             <div className="glass-card p-8 text-center">
                                <Icon name="Users" size={48} className="mx-auto text-primary mb-4" />
                                <h2 className="text-xl font-bold">Add Players to Begin</h2>
                                <p className="text-muted-foreground mb-4">This tournament has no players yet. Go to the Player Roster to add them.</p>
                                <Button onClick={() => navigate(`/tournament/${tournamentId}/players`)}>Go to Player Roster</Button>
                             </div>
                        )}
                        {tournamentState === 'ROSTER_READY' && (
                            <div className="space-y-6">
                                <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} />
                            </div>
                        )}
                        {tournamentState === 'ROUND_IN_PROGRESS' && (
                             <div className="space-y-6">
                                <ResultsTerminal players={players} onResultSubmit={handleResultSubmit} />
                                <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} />
                             </div>
                        )}
                        {tournamentState === 'ROUND_COMPLETE' && (
                             <div className="glass-card p-8 text-center">
                                <Icon name="CheckCircle" size={48} className="mx-auto text-success mb-4" />
                                <h2 className="text-xl font-bold">Round {tournamentInfo.currentRound} Complete!</h2>
                                <Button size="lg" className="shadow-glow mt-4" onClick={handleCompleteRound}>
                                    Proceed to Round {tournamentInfo.currentRound + 1}
                                </Button>
                             </div>
                        )}
                         {tournamentState === 'TOURNAMENT_COMPLETE' && (
                             <div className="glass-card p-8 text-center">
                                <Icon name="Trophy" size={48} className="mx-auto text-warning mb-4" />
                                <h2 className="text-xl font-bold">Tournament Finished!</h2>
                                <p className="text-muted-foreground mb-4">View the final results on the reports page.</p>
                                <Button size="lg" onClick={() => navigate(`/tournament/${tournamentId}/reports`)}>
                                    View Final Reports
                                </Button>
                             </div>
                        )}
                        <StandingsTable players={players} recentResults={recentResults} tournamentState={tournamentState} />
                    </motion.div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default TournamentCommandCenterDashboard;