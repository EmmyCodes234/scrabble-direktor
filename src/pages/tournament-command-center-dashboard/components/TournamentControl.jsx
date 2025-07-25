import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { toast } from 'sonner';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const assignStarts = (pairings, players) => {
    // This helper function remains unchanged
    return pairings.map(p => {
        if (p.player2.name === 'BYE') { p.player1.starts = false; p.player2.starts = false; return p; }
        const player1 = players.find(pl => pl.name === p.player1.name);
        const player2 = players.find(pl => pl.name === p.player2.name);
        if (player1?.starts < player2?.starts) { p.player1.starts = true; } 
        else if (player2?.starts < player1?.starts) { p.player2.starts = true; } 
        else { Math.random() > 0.5 ? p.player1.starts = true : p.player2.starts = true; }
        return p;
    });
};

const TournamentControl = ({ tournamentInfo, onRoundPaired, players, onEnterScore, recentResults }) => {
  const [currentPairings, setCurrentPairings] = useState([]);
  const [isPaired, setIsPaired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentRound = tournamentInfo?.currentRound || 1;
    if (tournamentInfo?.pairing_schedule && tournamentInfo.pairing_schedule[currentRound]) {
        setCurrentPairings(tournamentInfo.pairing_schedule[currentRound]);
        setIsPaired(true);
    } else {
        setIsPaired(false);
        setCurrentPairings([]);
    }
  }, [tournamentInfo]);
  
  const generatePairings = (playersToPair, pairingSystem, previousMatchups) => {
    // This logic is simplified for demonstration. A real implementation would be more complex.
    let availablePlayers = [...playersToPair].sort(() => 0.5 - Math.random());
    let newPairings = [];
    let table = 1;

    while (availablePlayers.length > 1) {
        let player1 = availablePlayers.shift();
        let opponentFound = false;
        for (let i = 0; i < availablePlayers.length; i++) {
            let player2 = availablePlayers[i];
            const matchupKey1 = `${player1.id}-${player2.id}`;
            const matchupKey2 = `${player2.id}-${player1.id}`;

            if (!previousMatchups.has(matchupKey1) && !previousMatchups.has(matchupKey2)) {
                newPairings.push({ table: table++, player1: { name: player1.name }, player2: { name: player2.name } });
                availablePlayers.splice(i, 1);
                opponentFound = true;
                break;
            }
        }
        if (!opponentFound) {
            // Fallback for when no non-rematch is possible
            let player2 = availablePlayers.shift();
            newPairings.push({ table: table++, player1: { name: player1.name }, player2: { name: player2.name } });
        }
    }
    if (availablePlayers.length === 1) {
        newPairings.push({ table: 'BYE', player1: { name: availablePlayers[0].name }, player2: { name: 'BYE' } });
    }
    return assignStarts(newPairings, players);
  };

  const handlePairCurrentRound = async () => {
    setIsLoading(true);
    
    const currentRound = tournamentInfo.currentRound || 1;
    const advancedSettings = tournamentInfo.advanced_pairing_modes?.[currentRound];

    // Determine which settings to use
    const pairingSystem = advancedSettings?.system || tournamentInfo.pairing_system;
    const baseRound = advancedSettings?.base_round ?? currentRound - 1;
    const allowRematches = advancedSettings?.allow_rematches ?? true;

    toast.info(`Pairing Round ${currentRound} using ${pairingSystem} system.`);
    if (baseRound !== currentRound -1) toast.info(`Basing standings on Round ${baseRound}.`);
    if (!allowRematches) toast.info("Rematches are disallowed for this round.");

    // Determine which player list to use for pairing
    let playersToPair = [...players];
    if (baseRound < currentRound - 1) {
        // We need to reconstruct historical standings
        const { data: historicalResults } = await supabase.from('results').select('*').eq('tournament_id', tournamentInfo.id).lte('round', baseRound);
        const statsMap = new Map(players.map(p => [p.id, { ...p, wins: 0, losses: 0, ties: 0 }]));
        for (const res of historicalResults) {
            const p1Stats = statsMap.get(res.player1_id);
            const p2Stats = statsMap.get(res.player2_id);
            if (!p1Stats || !p2Stats) continue;
            if (res.score1 > res.score2) { p1Stats.wins++; p2Stats.losses++; }
            else if (res.score2 > res.score1) { p2Stats.wins++; p1Stats.losses++; }
            else { p1Stats.ties++; p2Stats.ties++; }
        }
        playersToPair = Array.from(statsMap.values());
    }
    playersToPair.sort((a,b) => (b.wins + (b.ties*0.5)) - (a.wins + (a.ties*0.5)));

    // Build a set of previous matchups if rematches are disallowed
    let previousMatchups = new Set();
    if (!allowRematches) {
        const { data: allResults } = await supabase.from('results').select('player1_id, player2_id').eq('tournament_id', tournamentInfo.id);
        allResults.forEach(res => {
            previousMatchups.add(`${res.player1_id}-${res.player2_id}`);
        });
    }

    const singleRoundPairings = generatePairings(playersToPair, pairingSystem, previousMatchups);
    
    const schedule = {
        ...(tournamentInfo.pairing_schedule || {}),
        [currentRound]: singleRoundPairings
    };
    
    const { data, error } = await supabase.from('tournaments').update({ pairing_schedule: schedule }).eq('id', tournamentInfo.id).select().single();

    setIsLoading(false);
    if (error) {
        toast.error(`Failed to generate pairings: ${error.message}`);
    } else {
        onRoundPaired(data);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="font-heading font-semibold text-xl text-foreground mb-4">Command Deck</h2>
      <AnimatePresence mode="wait">
        <motion.div
            key={isPaired ? 'paired' : 'unpaired'}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
          {!isPaired ? (
              <div className="text-center">
                  <Button size="lg" onClick={handlePairCurrentRound} loading={isLoading} disabled={players.length < 2} className="w-full shadow-glow animate-pulse-bright mb-2">
                      Pair & Start Round {tournamentInfo.currentRound || 1}
                  </Button>
              </div>
          ) : (
               <div>
                  <h3 className="font-heading font-medium text-lg text-foreground mb-4">Pairings for Round {tournamentInfo.currentRound}</h3>
                  <div className="space-y-3">
                      {currentPairings.map((pairing) => {
                          const player1 = players.find(p => p.name === pairing.player1.name);
                          const player2 = players.find(p => p.name === pairing.player2.name);
                          const existingResult = recentResults.find(r => r.round === tournamentInfo.currentRound && ((r.player1_name === player1?.name && r.player2_name === player2?.name) || (r.player1_name === player2?.name && r.player2_name === player1?.name)));
                          return (
                              <div key={pairing.table} className="glass-card p-3 rounded-md flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 border border-primary/20 rounded-md shrink-0">
                                          <span className="font-mono font-bold text-primary text-lg">{pairing.table}</span>
                                      </div>
                                      <div className="text-sm">
                                          <div className="flex items-center gap-2">
                                              {pairing.player1.starts && <Icon name="Play" size={14} className="text-primary"/>}
                                              <span className="font-medium text-foreground">{player1?.name}</span>
                                              <span className="text-muted-foreground">(#{player1?.rank})</span>
                                          </div>
                                          <div className="my-1 pl-6 text-xs font-semibold text-muted-foreground">vs</div>
                                          <div className="flex items-center gap-2">
                                              {pairing.player2.starts && <Icon name="Play" size={14} className="text-primary"/>}
                                              <span className="font-medium text-foreground">{player2?.name}</span>
                                              <span className="text-muted-foreground">{player2 ? `(#${player2?.rank})` : ''}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <Button size="sm" variant={existingResult ? 'outline' : 'default'} onClick={() => onEnterScore({ ...pairing, round: tournamentInfo.currentRound }, existingResult)}>
                                      <Icon name={existingResult ? 'Edit' : 'ClipboardEdit'} size={16} className="mr-2"/>
                                      {existingResult ? 'Edit Score' : 'Enter Score'}
                                  </Button>
                              </div>
                          )
                      })}
                  </div>
              </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TournamentControl;