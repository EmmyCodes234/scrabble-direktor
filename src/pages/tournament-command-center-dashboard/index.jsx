import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentStats from './components/TournamentStats';
import TournamentControl from './components/TournamentControl';
import StandingsTable from './components/StandingsTable';
import ScoreEntryModal from './components/ScoreEntryModal';
import PlayerStatsModal from '../../components/PlayerStatsModal';
import PendingResults from './components/PendingResults';
import { Toaster, toast } from 'sonner';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { supabase } from '../../supabaseClient';
import DashboardSidebar from './components/DashboardSidebar';
import MobileNavBar from './components/MobileNavBar';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const TournamentCommandCenterDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [pendingResults, setPendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState({ isOpen: false, existingResult: null });
  const [activeMatchup, setActiveMatchup] = useState(null);
  const [selectedPlayerModal, setSelectedPlayerModal] = useState(null);
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const recalculateRanks = (playerList) => {
    if (!playerList) return [];
    const sorted = [...playerList].sort((a, b) => {
        if ((a.wins || 0) !== (b.wins || 0)) return (b.wins || 0) - (a.wins || 0);
        return (b.spread || 0) - (a.spread || 0);
    });
    return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) {
      setIsLoading(false);
      return;
    }
    // Only show initial full-page loader
    if (!tournamentInfo) setIsLoading(true);

    try {
      const { data: tournamentData, error: tErr } = await supabase
        .from('tournaments')
        .select(`*, tournament_players(*, players(*))`)
        .eq('id', tournamentId)
        .single();

      if (tErr || !tournamentData) throw tErr || new Error("Tournament not found");

      const combinedPlayers = tournamentData.tournament_players.map(tp => ({
        ...tp.players,
        ...tp
      }));
      
      const rankedPlayers = recalculateRanks(combinedPlayers);
      setPlayers(rankedPlayers);
      
      const updatedTournamentData = { ...tournamentData, players: rankedPlayers };
      setTournamentInfo(updatedTournamentData);

      const [
        { data: resultsData, error: rErr },
        { data: pendingData, error: pErr }
      ] = await Promise.all([
        supabase.from('results').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }),
        supabase.from('pending_results').select('*').eq('tournament_id', tournamentId).eq('status', 'pending').order('created_at', { ascending: true })
      ]);

      if (rErr) toast.error("Failed to load results.");
      else setRecentResults(resultsData || []);
      
      if (pErr) toast.error("Failed to load pending results.");
      else setPendingResults(pendingData || []);

    } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error(`A critical error occurred: ${error.message}`);
        setTournamentInfo(null);
    } finally {
        setIsLoading(false);
    }
  }, [tournamentId, tournamentInfo]);

  useEffect(() => {
    fetchTournamentData();
    
    const channel = supabase
      .channel(`dashboard-updates-for-tournament-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          fetchTournamentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTournamentData, tournamentId]);
  
  const handleRoundPaired = (updatedTournamentInfo) => {
    setTournamentInfo(updatedTournamentInfo);
  };

  const handleResultSubmit = async (result, isEditing = false) => {
    setIsSubmitting(true);
    try {
        const player1 = players.find(p => p.name === result.player1);
        const player2 = players.find(p => p.name === result.player2);

        if (!player1 || !player2) {
          throw new Error("Could not find one of the players in the current roster.");
        }

        if (!isEditing) {
            const resultToInsert = {
                tournament_id: tournamentId,
                round: tournamentInfo.currentRound || 1,
                player1_id: player1.player_id,
                player2_id: player2.player_id,
                player1_name: player1.name,
                player2_name: player2.name,
                score1: result.score1,
                score2: result.score2,
            };
            const { error } = await supabase.from('results').insert([resultToInsert]);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('results').update({ score1: result.score1, score2: result.score2 }).eq('id', result.id);
            if (error) throw error;
        }

        const { data: allResults } = await supabase.from('results').select('*').eq('tournament_id', tournamentId);
        
        const statsMap = new Map(players.map(p => [p.player_id, { wins: 0, losses: 0, ties: 0, spread: 0 }]));

        for (const res of allResults) {
            const p1Stats = statsMap.get(res.player1_id);
            const p2Stats = statsMap.get(res.player2_id);
            if (!p1Stats || !p2Stats) continue;
            
            p1Stats.spread += res.score1 - res.score2;
            p2Stats.spread += res.score2 - res.score1;

            if (res.score1 > res.score2) { p1Stats.wins += 1; p2Stats.losses += 1; }
            else if (res.score2 > res.score1) { p2Stats.wins += 1; p1Stats.losses += 1; }
            else { p1Stats.ties += 1; p2Stats.ties += 1; }
        }
        
        const updates = Array.from(statsMap.entries()).map(([player_id, stats]) => 
            supabase
                .from('tournament_players')
                .update(stats)
                .match({ tournament_id: tournamentId, player_id: player_id })
        );
        
        const results = await Promise.all(updates);
        const updateError = results.find(res => res.error);
        if (updateError) throw updateError.error;
        
        toast.success("Result recorded and standings updated!");
        await fetchTournamentData();
    } catch (error) {
        toast.error(`Operation failed: ${error.message}`);
        return Promise.reject(error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleCompleteRound = async () => {
    setIsSubmitting(true);
    const originalTournamentInfo = tournamentInfo;
    const currentRound = originalTournamentInfo.currentRound || 1;
    const totalRounds = originalTournamentInfo.rounds;
    const isFinalRound = currentRound >= totalRounds;

    setTournamentInfo(prev => ({
      ...prev,
      status: isFinalRound ? 'completed' : prev.status,
      currentRound: isFinalRound ? currentRound : currentRound + 1
    }));
    
    const updatePayload = isFinalRound
      ? { status: 'completed' }
      : { currentRound: currentRound + 1 };

    try {
      const { error } = await supabase.from('tournaments').update(updatePayload).eq('id', tournamentId);
      if (error) {
        toast.error(`Failed to proceed: ${error.message}`);
        setTournamentInfo(originalTournamentInfo);
      } else {
        toast.success(isFinalRound ? 'Tournament Complete!' : `Proceeding to Round ${currentRound + 1}`);
        await fetchTournamentData();
      }
    } catch (error) {
      toast.error(`An unexpected error occurred: ${error.message}`);
      setTournamentInfo(originalTournamentInfo);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterScore = (matchup, existingResult = null) => {
    setActiveMatchup(matchup);
    setShowScoreModal({ isOpen: true, existingResult: existingResult });
  };
  
  const handleEditResultFromModal = (resultToEdit) => {
    const player1 = players.find(p => p.name === resultToEdit.player1_name);
    const player2 = players.find(p => p.name === resultToEdit.player2_name);
    if (!player1 || !player2) {
        toast.error("Could not find players for this result.");
        return;
    }
    const roundPairings = tournamentInfo.pairing_schedule?.[resultToEdit.round];
    const pairing = roundPairings?.find(p => (p.player1.name === player1.name && p.player2.name === player2.name) || (p.player1.name === player2.name && p.player2.name === player1.name));
    const matchup = { player1, player2, table: pairing?.table || 'N/A', round: resultToEdit.round };
    setSelectedPlayerModal(null);
    setTimeout(() => handleEnterScore(matchup, resultToEdit), 150);
  };

  const handleApproveResult = async (pendingResult) => {
    const resultPayload = {
      player1: pendingResult.player1_name,
      player2: pendingResult.player2_name,
      score1: pendingResult.score1,
      score2: pendingResult.score2,
    };
    
    setPendingResults(prev => prev.filter(p => p.id !== pendingResult.id));

    try {
      await handleResultSubmit(resultPayload, false);
      const { error: deleteError } = await supabase.from('pending_results').delete().eq('id', pendingResult.id);
      if (deleteError) throw deleteError;
      toast.success("Pending result approved and recorded!");
    } catch (error) {
      toast.error(`Failed to approve result: ${error.message}`);
      fetchTournamentData();
    }
  };

  const handleRejectResult = async (id) => {
    setPendingResults(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('pending_results').delete().eq('id', id);
    if (error) {
        toast.error("Failed to reject result.");
        fetchTournamentData();
    } else {
        toast.info("Result has been rejected.");
    }
  };

  const getTournamentState = () => {
      if (!tournamentInfo) return 'NO_TOURNAMENT';
      if (tournamentInfo.status === 'completed') return 'TOURNAMENT_COMPLETE';
      const currentRound = tournamentInfo.currentRound || 1;
      const pairingsForCurrentRound = tournamentInfo.pairing_schedule?.[currentRound];
      if (pairingsForCurrentRound) {
          const resultsForCurrentRound = recentResults.filter(r => r.round === currentRound);
          const expectedResults = pairingsForCurrentRound.filter(p => p.player2.name !== 'BYE').length;
          if (resultsForCurrentRound.length >= expectedResults) return 'ROUND_COMPLETE';
          return 'ROUND_IN_PROGRESS';
      }
      if ((players || []).length >= 2) return 'ROSTER_READY';
      return 'EMPTY_ROSTER';
  };

  const tournamentState = getTournamentState();

  if (isLoading && !tournamentInfo) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>; }
  if (!tournamentInfo) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Tournament not found.</p></div>; }

  const MainContent = () => (
    <div className="space-y-6">
        <TournamentStats players={players} recentResults={recentResults} tournamentInfo={tournamentInfo}/>
        {tournamentInfo?.is_remote_submission_enabled && (
            <PendingResults pending={pendingResults} onApprove={handleApproveResult} onReject={handleRejectResult} />
        )}
        <AnimatePresence mode="wait">
          <motion.div key={tournamentState} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
              {(tournamentState === 'ROSTER_READY' || tournamentState === 'ROUND_IN_PROGRESS') && <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} onEnterScore={handleEnterScore} recentResults={recentResults} />}
              {tournamentState === 'ROUND_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="CheckCircle" size={48} className="mx-auto text-success mb-4" /> <h2 className="text-xl font-bold">Round {tournamentInfo.currentRound} Complete!</h2> <Button size="lg" className="shadow-glow mt-4" onClick={handleCompleteRound} loading={isSubmitting}> {tournamentInfo.currentRound >= tournamentInfo.rounds ? 'Finish Tournament' : `Proceed to Round ${tournamentInfo.currentRound + 1}`} </Button> </div> )}
              {tournamentState === 'TOURNAMENT_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="Trophy" size={48} className="mx-auto text-warning mb-4" /> <h2 className="text-xl font-bold">Tournament Finished!</h2> <p className="text-muted-foreground mb-4">View the final reports on the reports page.</p> <Button size="lg" onClick={() => navigate(`/tournament/${tournamentId}/reports`)}>View Final Reports</Button> </div> )}
          </motion.div>
        </AnimatePresence>
        {(tournamentState === 'ROUND_IN_PROGRESS' || tournamentState === 'ROUND_COMPLETE' || tournamentState === 'TOURNAMENT_COMPLETE') &&
            <StandingsTable players={players} recentResults={recentResults} onSelectPlayer={setSelectedPlayerModal} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />
      <ScoreEntryModal isOpen={showScoreModal.isOpen} onClose={() => setShowScoreModal({ isOpen: false, existingResult: null })} matchup={activeMatchup} onResultSubmit={handleResultSubmit} existingResult={showScoreModal.existingResult} />
      <PlayerStatsModal player={selectedPlayerModal} results={recentResults} onClose={() => setSelectedPlayerModal(null)} onSelectPlayer={(name) => setSelectedPlayerModal(players.find(p => p.name === name))} onEditResult={handleEditResultFromModal} />
      <main className="pt-20 pb-24 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {isDesktop ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1"><DashboardSidebar tournamentId={tournamentId} /></div>
                    <div className="md:col-span-3"><MainContent /></div>
                </div>
            ) : ( 
                <MainContent /> 
            )}
        </div>
      </main>
      {!isDesktop && <MobileNavBar tournamentId={tournamentId} />}
    </div>
  );
};

export default TournamentCommandCenterDashboard;