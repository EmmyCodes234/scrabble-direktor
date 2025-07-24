import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentStats from './components/TournamentStats';
import TournamentControl from './components/TournamentControl';
import StandingsTable from './components/StandingsTable';
import ScoreEntryModal from './components/ScoreEntryModal';
import { Toaster, toast } from 'sonner';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { supabase } from '../../supabaseClient';
import DashboardSidebar from './components/DashboardSidebar';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const TournamentCommandCenterDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState({ isOpen: false, existingResult: null });
  const [activeMatchup, setActiveMatchup] = useState(null);
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const recalculateRanks = (playerList) => {
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
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      if (error || !data) throw error || new Error("Tournament not found");
      
      setTournamentInfo(data);
      setPlayers(recalculateRanks(data.players || []));

      const { data: resultsData, error: resultsError } = await supabase.from('results').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false });
      if (resultsError) toast.error("Failed to load results.");
      else setRecentResults(resultsData || []);
    } catch (error) {
        console.error("Error fetching tournament:", error);
        setTournamentInfo(null);
    } finally {
        setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);
  
  const handleRoundPaired = (updatedTournamentInfo) => {
    setTournamentInfo(updatedTournamentInfo);
  };

  const handleResultSubmit = async (result, isEditing = false) => {
    setIsSubmitting(true);
    try {
        if (isEditing) {
            // --- UPDATE LOGIC ---
            const { error: updateError } = await supabase.from('results').update({ score1: result.score1, score2: result.score2 }).eq('id', result.id);
            if (updateError) throw updateError;
            toast.success(`Result updated successfully! Recalculating all stats...`);
        } else {
            // --- CREATE LOGIC ---
            const currentRound = tournamentInfo.currentRound || 1;
            const resultToInsert = {
                tournament_id: tournamentId, round: currentRound,
                player1_name: result.player1, player2_name: result.player2,
                score1: result.score1, score2: result.score2,
            };
            const { error: insertError } = await supabase.from('results').insert([resultToInsert]);
            if (insertError) throw insertError;
            toast.success(`Result for ${result.player1} vs ${result.player2} recorded!`);
        }

        // --- RECALCULATE ALL STATS FROM SCRATCH ---
        // This is the most robust way to ensure data integrity after any change.
        const { data: allResults, error: resultsError } = await supabase.from('results').select('*').eq('tournament_id', tournamentId);
        if (resultsError) throw resultsError;

        const { data: currentTournament, error: tourneyError } = await supabase.from('tournaments').select('players').eq('id', tournamentId).single();
        if (tourneyError) throw tourneyError;

        let initialPlayers = currentTournament.players.map(p => ({...p, wins: 0, losses: 0, ties: 0, spread: 0}));

        allResults.forEach(res => {
            const player1 = initialPlayers.find(p => p.name === res.player1_name);
            const player2 = initialPlayers.find(p => p.name === res.player2_name);
            if (!player1 || !player2) return;

            const isDraw = res.score1 === res.score2;
            player1.spread += res.score1 - res.score2;
            player2.spread += res.score2 - res.score1;
            if (isDraw) {
                player1.ties += 1;
                player2.ties += 1;
            } else if (res.score1 > res.score2) {
                player1.wins += 1;
                player2.losses += 1;
            } else {
                player2.wins += 1;
                player1.losses += 1;
            }
        });

        const rankedPlayers = recalculateRanks(initialPlayers);
        const { error: playerUpdateError } = await supabase.from('tournaments').update({ players: rankedPlayers }).eq('id', tournamentId);
        if (playerUpdateError) throw playerUpdateError;

        // Finally, refresh the UI with the newly calculated and saved data
        await fetchTournamentData();

    } catch (error) {
        toast.error(`Operation failed: ${error.message}`);
        return Promise.reject(error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleCompleteRound = async () => { /* ... (existing logic) ... */ };

  const handleEnterScore = (matchup, existingResult = null) => {
    setActiveMatchup(matchup);
    setShowScoreModal({ isOpen: true, existingResult: existingResult });
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
        <AnimatePresence mode="wait">
          <motion.div key={tournamentState} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
              {(tournamentState === 'ROSTER_READY' || tournamentState === 'ROUND_IN_PROGRESS') && <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} onEnterScore={handleEnterScore} recentResults={recentResults} />}
              {tournamentState === 'ROUND_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="CheckCircle" size={48} className="mx-auto text-success mb-4" /> <h2 className="text-xl font-bold">Round {tournamentInfo.currentRound} Complete!</h2> <Button size="lg" className="shadow-glow mt-4" onClick={handleCompleteRound}> {tournamentInfo.currentRound === tournamentInfo.rounds ? 'Finish Tournament' : `Proceed to Round ${tournamentInfo.currentRound + 1}`} </Button> </div> )}
              {tournamentState === 'TOURNAMENT_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="Trophy" size={48} className="mx-auto text-warning mb-4" /> <h2 className="text-xl font-bold">Tournament Finished!</h2> <p className="text-muted-foreground mb-4">View the final reports on the reports page.</p> <Button size="lg" onClick={() => navigate(`/tournament/${tournamentId}/reports`)}>View Final Reports</Button> </div> )}
          </motion.div>
        </AnimatePresence>
        {(tournamentState === 'ROUND_IN_PROGRESS' || tournamentState === 'ROUND_COMPLETE' || tournamentState === 'TOURNAMENT_COMPLETE') &&
            <StandingsTable players={players} recentResults={recentResults} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />
      <ScoreEntryModal isOpen={showScoreModal.isOpen} onClose={() => setShowScoreModal({ isOpen: false, existingResult: null })} matchup={activeMatchup} onResultSubmit={handleResultSubmit} existingResult={showScoreModal.existingResult} />
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {isDesktop ? (
                <div className="grid grid-cols-4 gap-8">
                    <div className="col-span-1"><DashboardSidebar /></div>
                    <div className="col-span-3"><MainContent /></div>
                </div>
            ) : ( <MainContent /> )}
        </div>
      </main>
    </div>
  );
};

export default TournamentCommandCenterDashboard;