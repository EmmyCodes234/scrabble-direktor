import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentStats from './components/TournamentStats';
import TournamentControl from './components/TournamentControl';
import StandingsTable from './components/StandingsTable';
import ScoreEntryModal from './components/ScoreEntryModal';
import PlayerStatsModal from '../../components/PlayerStatsModal';
import PendingResults from './components/PendingResults';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Toaster, toast } from 'sonner';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { supabase } from '../../supabaseClient';
import DashboardSidebar from './components/DashboardSidebar';
import MobileNavBar from './components/MobileNavBar';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import AnnouncementsManager from './components/AnnouncementsManager';

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Memoized Main Content to prevent unnecessary re-renders
const MainContent = React.memo(({ tournamentInfo, players, recentResults, pendingResults, tournamentState, handlers, teamStandings }) => {
    const navigate = useNavigate();
    const { tournamentId } = useParams();
    const { 
        handleRoundPaired, 
        handleEnterScore, 
        handleCompleteRound, 
        handleApproveResult, 
        handleRejectResult, 
        setSelectedPlayerModal, 
        isSubmitting,
        handleUnpairRound
    } = handlers;
    
    return (
        <div className="space-y-6">
            <AnnouncementsManager />
            <TournamentStats players={players} recentResults={recentResults} tournamentInfo={tournamentInfo}/>
            {tournamentInfo?.is_remote_submission_enabled && (
                <PendingResults pending={pendingResults} onApprove={handleApproveResult} onReject={handleRejectResult} />
            )}
            <AnimatePresence mode="wait">
              <motion.div key={tournamentState} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>
                  {(tournamentState === 'ROSTER_READY' || tournamentState === 'ROUND_IN_PROGRESS') && <TournamentControl tournamentInfo={tournamentInfo} onRoundPaired={handleRoundPaired} players={players} onEnterScore={handleEnterScore} recentResults={recentResults} onUnpairRound={handleUnpairRound} />}
                  {tournamentState === 'ROUND_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="CheckCircle" size={48} className="mx-auto text-success mb-4" /> <h2 className="text-xl font-bold">Round {tournamentInfo.currentRound} Complete!</h2> <Button size="lg" className="shadow-glow mt-4" onClick={handleCompleteRound} loading={isSubmitting}> {tournamentInfo.currentRound >= tournamentInfo.rounds ? 'Finish Tournament' : `Proceed to Round ${tournamentInfo.currentRound + 1}`} </Button> </div> )}
                  {tournamentState === 'TOURNAMENT_COMPLETE' && ( <div className="glass-card p-8 text-center"> <Icon name="Trophy" size={48} className="mx-auto text-warning mb-4" /> <h2 className="text-xl font-bold">Tournament Finished!</h2> <p className="text-muted-foreground mb-4">View the final reports on the reports page.</p> <Button size="lg" onClick={() => navigate(`/tournament/${tournamentId}/reports`)}>View Final Reports</Button> </div> )}
              </motion.div>
            </AnimatePresence>
            {(tournamentState === 'ROUND_IN_PROGRESS' || tournamentState === 'ROUND_COMPLETE' || tournamentState === 'TOURNAMENT_COMPLETE') &&
                <StandingsTable players={players} recentResults={recentResults} onSelectPlayer={setSelectedPlayerModal} tournamentType={tournamentInfo?.type} teamStandings={teamStandings} />}
        </div>
    );
});


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
  const [teams, setTeams] = useState([]);
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) {
      setIsLoading(false);
      return;
    }
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
      
      setPlayers(combinedPlayers);
      setTournamentInfo(tournamentData);

      const [{ data: resultsData }, { data: pendingData }, { data: teamsData }] = await Promise.all([
        supabase.from('results').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }),
        supabase.from('pending_results').select('*').eq('tournament_id', tournamentId).eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('teams').select('*').eq('tournament_id', tournamentId)
      ]);
      setRecentResults(resultsData || []);
      setPendingResults(pendingData || []);
      setTeams(teamsData || []);

    } catch (error) {
        console.error("Error fetching tournament:", error);
        toast.error(`A critical error occurred: ${error.message}`);
        setTournamentInfo(null);
    } finally {
        setIsLoading(false);
    }
  }, [tournamentId, tournamentInfo]);
  
  const debouncedFetch = useMemo(() => debounce(fetchTournamentData, 300), [fetchTournamentData]);

  useEffect(() => {
    fetchTournamentData();
    const channel = supabase
      .channel(`dashboard-updates-for-tournament-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          debouncedFetch();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tournamentId, debouncedFetch, fetchTournamentData]);

  const teamMap = useMemo(() => new Map(teams.map(team => [team.id, team.name])), [teams]);

  const teamStandings = useMemo(() => {
      if (tournamentInfo?.type !== 'team' || !teams.length || !players.length) return [];
      const resultsByRound = recentResults.reduce((acc, result) => {
          (acc[result.round] = acc[result.round] || []).push(result);
          return acc;
      }, {});
      const teamStats = teams.map(team => ({ id: team.id, name: team.name, teamWins: 0, teamLosses: 0, individualWins: 0, totalSpread: 0, players: players.filter(p => p.team_id === team.id) }));
      Object.values(resultsByRound).forEach(roundResults => {
          const teamRoundWins = new Map();
          roundResults.forEach(result => {
              const p1 = players.find(p => p.player_id === result.player1_id);
              const p2 = players.find(p => p.player_id === result.player2_id);
              if (!p1 || !p2 || !p1.team_id || !p2.team_id || p1.team_id === p2.team_id) return;
              if (result.score1 > result.score2) {
                  teamRoundWins.set(p1.team_id, (teamRoundWins.get(p1.team_id) || 0) + 1);
              } else if (result.score2 > result.score1) {
                  teamRoundWins.set(p2.team_id, (teamRoundWins.get(p2.team_id) || 0) + 1);
              }
          });
          if(teamRoundWins.size > 0) {
              const [team1Id, team1Wins] = [...teamRoundWins.entries()][0];
              const [team2Id, team2Wins] = [...teamRoundWins.entries()][1] || [null, 0];
              const team1 = teamStats.find(t => t.id === team1Id);
              const team2 = teamStats.find(t => t.id === team2Id);
              if(team1 && team2) {
                  if (team1Wins > team2Wins) {
                      team1.teamWins++;
                      team2.teamLosses++;
                  } else if (team2Wins > team1Wins) {
                      team2.teamWins++;
                      team1.teamLosses++;
                  }
              }
          }
      });
      teamStats.forEach(team => {
          team.individualWins = team.players.reduce((sum, p) => sum + (p.wins || 0), 0);
          team.totalSpread = team.players.reduce((sum, p) => sum + (p.spread || 0), 0);
      });
      return teamStats.sort((a, b) => {
          if (a.teamWins !== b.teamWins) return b.teamWins - a.teamWins;
          if (a.individualWins !== b.individualWins) return b.individualWins - a.individualWins;
          return b.totalSpread - a.totalSpread;
      }).map((team, index) => ({ ...team, rank: index + 1 }));
  }, [players, recentResults, teams, tournamentInfo]);
  
  const rankedPlayers = useMemo(() => {
    return players.sort((a, b) => {
        if ((a.wins || 0) !== (b.wins || 0)) return (b.wins || 0) - (a.wins || 0);
        return (b.spread || 0) - (a.spread || 0);
    }).map((player, index) => ({ ...player, rank: index + 1 }));
  }, [players]);
  
  const handleRoundPaired = (updatedTournamentInfo) => setTournamentInfo(updatedTournamentInfo);

  const handleUnpairRound = () => {
      setShowUnpairModal(true);
  };

  const confirmUnpairRound = async () => {
      const currentRound = tournamentInfo.currentRound || 1;
      toast.info(`Unpairing Round ${currentRound}...`);
      const { error: deleteError } = await supabase.from('results').delete().eq('tournament_id', tournamentId).eq('round', currentRound);
      if (deleteError) {
          toast.error(`Failed to delete existing results: ${deleteError.message}`);
          setShowUnpairModal(false);
          return;
      }
      const newSchedule = { ...tournamentInfo.pairing_schedule };
      delete newSchedule[currentRound];
      const { data, error: updateError } = await supabase.from('tournaments').update({ pairing_schedule: newSchedule }).eq('id', tournamentId).select().single();
      if (updateError) {
          toast.error(`Failed to unpair round: ${updateError.message}`);
      } else {
          toast.success(`Round ${currentRound} has been unpaired.`);
          setTournamentInfo(data);
      }
      setShowUnpairModal(false);
  };

  const handleResultSubmit = async (result, isEditing = false) => {
    setIsSubmitting(true);
    try {
        const player1 = players.find(p => p.name === result.player1);
        const player2 = players.find(p => p.name === result.player2);
        if (!player1 || !player2) throw new Error("Could not find players.");

        if (!isEditing) {
            await supabase.from('results').insert([{
                tournament_id: tournamentId, round: tournamentInfo.currentRound || 1,
                player1_id: player1.player_id, player2_id: player2.player_id,
                player1_name: player1.name, player2_name: player2.name,
                score1: result.score1, score2: result.score2,
            }]);
        } else {
            await supabase.from('results').update({ score1: result.score1, score2: result.score2 }).eq('id', result.id);
        }

        const { data: allResults } = await supabase.from('results').select('*').eq('tournament_id', tournamentId);
        const statsMap = new Map(players.map(p => [p.player_id, { wins: 0, losses: 0, ties: 0, spread: 0 }]));

        allResults.forEach(res => {
            const p1Stats = statsMap.get(res.player1_id);
            const p2Stats = statsMap.get(res.player2_id);
            if (!p1Stats || !p2Stats) return;
            p1Stats.spread += res.score1 - res.score2;
            p2Stats.spread += res.score2 - res.score1;
            if (res.score1 > res.score2) { p1Stats.wins++; p2Stats.losses++; }
            else if (res.score2 > res.score1) { p2Stats.wins++; p1Stats.losses++; }
            else { p1Stats.ties++; p2Stats.ties++; }
        });
        
        const updates = Array.from(statsMap.entries()).map(([player_id, stats]) => 
            supabase.from('tournament_players').update(stats).match({ tournament_id: tournamentId, player_id: player_id })
        );
        await Promise.all(updates);
        toast.success("Standings updated!");
    } catch (error) {
        toast.error(`Operation failed: ${error.message}`);
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
    setTournamentInfo(prev => ({ ...prev, status: isFinalRound ? 'completed' : prev.status, currentRound: isFinalRound ? currentRound : currentRound + 1 }));
    const updatePayload = isFinalRound ? { status: 'completed' } : { currentRound: currentRound + 1 };
    try {
      const { error } = await supabase.from('tournaments').update(updatePayload).eq('id', tournamentId);
      if (error) {
        toast.error(`Failed to proceed: ${error.message}`);
        setTournamentInfo(originalTournamentInfo);
      } else {
        toast.success(isFinalRound ? 'Tournament Complete!' : `Proceeding to Round ${currentRound + 1}`);
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
    setPendingResults(prev => prev.filter(p => p.id !== pendingResult.id));
    try {
        await handleResultSubmit({
            player1: pendingResult.player1_name,
            player2: pendingResult.player2_name,
            score1: pendingResult.score1,
            score2: pendingResult.score2,
        });
      await supabase.from('pending_results').delete().eq('id', pendingResult.id);
    } catch (error) {
      toast.error(`Failed to approve result: ${error.message}`);
    }
  };

  const handleRejectResult = async (id) => {
    await supabase.from('pending_results').delete().eq('id', id);
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
      return (players || []).length >= 2 ? 'ROSTER_READY' : 'EMPTY_ROSTER';
  };

  const tournamentState = getTournamentState();
  const handlers = { handleRoundPaired, handleEnterScore, handleCompleteRound, handleApproveResult, handleRejectResult, setSelectedPlayerModal, isSubmitting, handleUnpairRound };

  if (isLoading) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading Dashboard...</p></div>; }
  if (!tournamentInfo) { return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Tournament not found.</p></div>; }

  const hasResultsForCurrentRound = recentResults.some(r => r.round === (tournamentInfo.currentRound || 1));

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />
      <ConfirmationModal
          isOpen={showUnpairModal}
          title="Unpair Current Round"
          message={`Are you sure you want to unpair Round ${tournamentInfo.currentRound || 1}? ${hasResultsForCurrentRound ? 'All results entered for this round will be permanently deleted.' : 'This will remove the current pairings.'}`}
          onConfirm={confirmUnpairRound}
          onCancel={() => setShowUnpairModal(false)}
          confirmText="Yes, Unpair"
      />
      <ScoreEntryModal isOpen={showScoreModal.isOpen} onClose={() => setShowScoreModal({ isOpen: false, existingResult: null })} matchup={activeMatchup} onResultSubmit={handleResultSubmit} existingResult={showScoreModal.existingResult} />
      <PlayerStatsModal 
          player={selectedPlayerModal} 
          results={recentResults} 
          onClose={() => setSelectedPlayerModal(null)} 
          onSelectPlayer={(name) => setSelectedPlayerModal(players.find(p => p.name === name))} 
          onEditResult={handleEditResultFromModal}
          teamName={selectedPlayerModal?.team_id ? teamMap.get(selectedPlayerModal.team_id) : null}
      />
      <main className="pt-20 pb-24 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {isDesktop ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1"><DashboardSidebar tournamentId={tournamentId} /></div>
                    <div className="md:col-span-3"><MainContent {...{ tournamentInfo, players: rankedPlayers, recentResults, pendingResults, tournamentState, handlers, teamStandings }} /></div>
                </div>
            ) : ( 
                <MainContent {...{ tournamentInfo, players: rankedPlayers, recentResults, pendingResults, tournamentState, handlers, teamStandings }} />
            )}
        </div>
      </main>
      {!isDesktop && <MobileNavBar tournamentId={tournamentId} />}
    </div>
  );
};

export default TournamentCommandCenterDashboard;