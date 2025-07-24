import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentStats from './components/TournamentStats';
import TournamentControl from './components/TournamentControl';
import PendingResults from './components/PendingResults';
import StandingsTable from './components/StandingsTable';
import ScoreEntryModal from './components/ScoreEntryModal';
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
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [activeMatchup, setActiveMatchup] = useState(null);
  const navigate = useNavigate();
  const { tournamentId } = useParams();

  const fetchTournamentData = async () => {
    if (!tournamentId) {
      setIsLoading(false);
      setTournamentInfo(null);
      return;
    }
    try {
      const { data, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      if (error || !data) throw error || new Error("Tournament not found");
      setTournamentInfo(data);
      setPlayers(data.players || []);
      const { data: resultsData, error: resultsError } = await supabase.from('results').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false });
      if (resultsError) toast.error("Failed to load results.");
      else setRecentResults(resultsData || []);
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

  const recalculateRanks = (playerList) => {
    const sorted = [...playerList].sort((a, b) => {
        if ((a.wins || 0) !== (b.wins || 0)) return (b.wins || 0) - (a.wins || 0);
        return (b.spread || 0) - (a.spread || 0);
    });
    return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const updateTournamentPlayers = async (newPlayers) => {
    const rankedPlayers = recalculateRanks(newPlayers);
    const { error } = await supabase.from('tournaments').update({ players: rankedPlayers, "playerCount": rankedPlayers.length }).eq('id', tournamentId);
    if (error) toast.error("Failed to update player list.");
    else setPlayers(rankedPlayers);
  };

  const handleResultSubmit = async (result, pendingResultId = null) => {
    const currentRound = tournamentInfo.currentRound || 1;
    const { error: insertError } = await supabase.from('results').insert([{ ...result, tournament_id: tournamentId, round: currentRound, player1_name: result.player1, player2_name: result.player2 }]);
    if (insertError) {
      toast.error("Failed to record result.");
      return Promise.reject(insertError);
    }
    
    const updatedPlayers = players.map(player => {
      let newStats = {};
      const isPlayer1 = player.name === result.player1;
      const isPlayer2 = player.name === result.player2;

      if (isPlayer1 || isPlayer2) {
        const isDraw = result.score1 === result.score2;
        const won = isDraw ? false : (isPlayer1 && result.score1 > result.score2) || (isPlayer2 && result.score2 > result.score1);
        
        newStats.wins = (player.wins || 0) + (isDraw ? 0.5 : (won ? 1 : 0));
        newStats.losses = (player.losses || 0) + (isDraw ? 0 : (won ? 0 : 1));
        newStats.ties = (player.ties || 0) + (isDraw ? 1 : 0);
        newStats.spread = (player.spread || 0) + (isPlayer1 ? (result.score1 - result.score2) : (result.score2 - result.score1));
      }
      
      return { ...player, ...newStats };
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
    const { data, error } = await supabase.from('tournaments').update({ currentRound: nextRound }).eq('id', tournamentId).select().single();
    if (error) toast.error("Failed to advance to the next round.");
    else {
        toast.success(`Round ${currentRound} complete. Proceeding to Round ${nextRound}.`);
        setTournamentInfo(data);
    }
  };

  const handleEnterScore = (matchup) => {
    setActiveMatchup(matchup);
    setShowScoreModal(true);
  };
  
  const getTournamentState = () => {
      if (!tournamentInfo) return 'NO_TOURNAMENT';
      if (tournamentInfo.status === 'completed') return 'TOURNAMENT_COMPLETE';
      const currentRound = tournamentInfo.currentRound || 1;
      const pairingsForCurrentRound = tournamentInfo.pairing_schedule?.[currentRound];
      if (pairingsForCurrentRound) {
          const resultsForCurrentRound = recentResults.filter(r => r.round === currentRound);
          const expectedResults = pairingsForCurrentRound.filter(p => p.table !== 'BYE').length;
          if (resultsForCurrentRound.length >= expectedResults) return 'ROUND_COMPLETE';
          return 'ROUND_IN_PROGRESS';
      }
      if ((tournamentInfo.players || []).length >= 2) return 'ROSTER_READY';
      return 'EMPTY_ROSTER';
  };

  const tournamentState = getTournamentState();

  if (isLoading) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>; }
  if (!tournamentInfo) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Tournament not found.</p></div>; }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />
      <ScoreEntryModal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        matchup={activeMatchup}
        onResultSubmit={handleResultSubmit}
      />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <DashboardSidebar />
                <div className="md:col-span-3 space-y-6">
                    <motion.div>
                        <TournamentStats players={players} recentResults={recentResults} tournamentInfo={tournamentInfo}/>
                    </motion.div>
                    <motion.div>
                        {tournamentState === 'ROSTER_READY' && (
                            <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} onEnterScore={handleEnterScore} />
                        )}
                        {tournamentState === 'ROUND_IN_PROGRESS' && (
                             <div className="space-y-6">
                                <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} onEnterScore={handleEnterScore} />
                                <StandingsTable players={players} recentResults={recentResults} tournamentState={tournamentState} />
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
                        {(tournamentState === 'ROUND_IN_PROGRESS' || tournamentState === 'ROUND_COMPLETE' || tournamentState === 'TOURNAMENT_COMPLETE') &&
                            <StandingsTable players={players} recentResults={recentResults} tournamentState={tournamentState} />
                        }
                    </motion.div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default TournamentCommandCenterDashboard;