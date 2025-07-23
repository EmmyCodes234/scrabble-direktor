import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';
import Icon from '../../../components/AppIcon';
import { toast } from 'sonner';
import { supabase } from '../../../supabaseClient';

const assignStarts = (pairings, players) => {
    return pairings.map(p => {
        if (p.player2.name === 'BYE') {
            p.player1.starts = false;
            p.player2.starts = false;
            return p;
        }
        const player1 = players.find(pl => pl.name === p.player1.name);
        const player2 = players.find(pl => pl.name === p.player2.name);
        const p1Starts = player1?.starts || 0;
        const p2Starts = player2?.starts || 0;

        if (p1Starts < p2Starts) {
            p.player1.starts = true;
        } else if (p2Starts < p1Starts) {
            p.player2.starts = true;
        } else {
            if (Math.random() > 0.5) {
                p.player1.starts = true;
            } else {
                p.player2.starts = true;
            }
        }
        return p;
    });
};

const TournamentControl = ({ tournamentInfo, onRoundPaired, players }) => {
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
  
  const generatePairings = () => {
    let newPairings = [];
    const playersByWins = players.reduce((acc, player) => {
        const wins = player.wins || 0;
        if (!acc[wins]) acc[wins] = [];
        acc[wins].push(player);
        return acc;
    }, {});
    const sortedGroups = Object.keys(playersByWins).sort((a, b) => b - a).map(winCount => {
        return playersByWins[winCount].sort(() => 0.5 - Math.random());
    });
    const sortedPlayers = sortedGroups.flat();
    for (let i = 0; i < sortedPlayers.length; i += 2) {
        if(sortedPlayers[i+1]) {
            newPairings.push({ table: i/2+1, player1: {name: sortedPlayers[i].name}, player2: {name: sortedPlayers[i+1].name}})
        } else {
            newPairings.push({ table: 'BYE', player1: {name: sortedPlayers[i].name}, player2: {name: 'BYE'}})
        }
    }
    return assignStarts(newPairings, players);
  };

  const handlePairCurrentRound = async () => {
    setIsLoading(true);
    toast.info(`Pairing Round ${tournamentInfo.currentRound || 1} using ${tournamentInfo.pairing_system || 'Swiss'} system.`);
    const newPairings = generatePairings();
    const currentRound = tournamentInfo?.currentRound || 1;
    const schedule = {
        ...(tournamentInfo.pairing_schedule || {}),
        [currentRound]: newPairings
    };
    
    const { data, error } = await supabase
        .from('tournaments')
        .update({ pairing_schedule: schedule })
        .eq('id', tournamentInfo.id)
        .select()
        .single();

    setIsLoading(false);
    if (error) {
        toast.error("Failed to generate and save pairings.");
    } else {
        onRoundPaired(data);
    }
  };

  const isPairingReady = players.length >= 2;

  return (
    <div className="glass-card p-6">
      <div>
        <h2 className="font-heading font-semibold text-xl text-foreground mb-4">
          Command Deck
        </h2>
        {!isPaired ? (
            <div className="text-center">
                <Button
                    variant="default"
                    size="lg"
                    onClick={handlePairCurrentRound}
                    loading={isLoading}
                    disabled={!isPairingReady}
                    className="w-full shadow-glow animate-pulse-bright mb-2"
                >
                    Pair & Start Round {tournamentInfo.currentRound || 1}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Using <span className="font-semibold text-foreground">{tournamentInfo.pairing_system || 'Swiss'}</span> system
                </p>
            </div>
        ) : (
             <div>
                <h3 className="font-heading font-medium text-lg text-foreground mb-4">
                  Pairings for Round {tournamentInfo.currentRound}
                </h3>
                <div className="space-y-3">
                    {currentPairings.map((pairing) => {
                        const player1 = players.find(p => p.name === pairing.player1.name);
                        const player2 = players.find(p => p.name === pairing.player2.name);
                        return (
                            <div key={pairing.table} className="glass-card p-3 rounded-md flex items-center space-x-4">
                                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 border border-primary/20 rounded-md shrink-0">
                                    <span className="font-mono font-bold text-primary text-lg">{pairing.table}</span>
                                </div>
                                <div className="flex-1 flex flex-col items-start text-sm">
                                    <div className="flex items-center gap-2">
                                        {pairing.player1.starts && <Icon name="Play" size={14} className="text-primary"/>}
                                        <span className="font-medium text-foreground">{player1?.name}</span>
                                        <span className="text-muted-foreground">(#{player1?.rank})</span>
                                        {pairing.player1.starts && <span className="font-bold text-primary text-xs">*STARTS</span>}
                                    </div>
                                    <div className="my-1 pl-6 text-xs font-semibold text-muted-foreground">vs</div>
                                    <div className="flex items-center gap-2">
                                        {pairing.player2.starts && <Icon name="Play" size={14} className="text-primary"/>}
                                        <span className="font-medium text-foreground">{player2?.name}</span>
                                        <span className="text-muted-foreground">{player2 ? `(#${player2?.rank})` : ''}</span>
                                        {pairing.player2.starts && <span className="font-bold text-primary text-xs">*STARTS</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TournamentControl;