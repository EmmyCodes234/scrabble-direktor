import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { supabase } from 'supabaseClient';
import PlayerStatsModal from 'components/PlayerStatsModal';
import ResultSubmissionModal from 'components/ResultSubmissionModal';
import Button from 'components/ui/Button';
import { cn } from 'utils/cn';
import 'styles/ticker.css';
import { Toaster } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import TournamentTicker from '../components/TournamentTicker';
import AnnouncementsDisplay from 'components/AnnouncementsDisplay';

const StatCard = ({ icon, label, value, subtext, color = 'text-primary' }) => (
    <div className="glass-card p-4">
        <div className="flex items-center space-x-3">
            <Icon name={icon} size={24} className={color} />
            <div>
                <p className="text-xl font-bold font-mono">{value}</p>
                <p className="text-sm text-foreground font-medium">{label}</p>
                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            </div>
        </div>
    </div>
);

const formatPlayerName = (name, players) => {
    if (!name) return { formattedName: '', seedInfo: '' };
    const player = players.find(p => p.name === name);
    const seed = player?.seed;
    const parts = name.split(' ');
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { formattedName: `${lastName}, ${firstName}`, seedInfo: seed ? `(A${seed})` : '' };
};

const PublicTournamentPage = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [results, setResults] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showPairingsDropdown, setShowPairingsDropdown] = useState(true);

    const standingsRef = useRef(null);
    const pairingsRef = useRef(null);
    const statsRef = useRef(null);
    const rosterRef = useRef(null);

    const recalculateRanks = useCallback((playerList) => {
        if (!playerList) return [];
        return [...playerList].sort((a, b) => {
            if ((a.wins || 0) !== (b.wins || 0)) return (b.wins || 0) - (a.wins || 0);
            return (b.spread || 0) - (a.spread || 0);
        }).map((player, index) => ({ ...player, rank: index + 1 }));
    }, []);

    useEffect(() => {
        const fetchPublicData = async () => {
            if (!tournamentId) { setLoading(false); return; }
            setLoading(true);
            
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
                
                setPlayers(recalculateRanks(combinedPlayers));
                setTournament(tournamentData);

                const [{ data: resultsData }, {data: teamsData}] = await Promise.all([
                    supabase.from('results').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }),
                    supabase.from('teams').select('id, name').eq('tournament_id', tournamentId)
                ]);

                setResults(resultsData || []);
                setTeams(teamsData || []);

            } catch (error) {
                console.error("Error fetching public data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
        
    }, [tournamentId, recalculateRanks]);

    const teamMap = useMemo(() => new Map(teams.map(team => [team.id, team.name])), [teams]);
    
    const tickerMessages = useMemo(() => {
        return results.slice(0, 10).map(r => {
            if (r.score1 > r.score2) {
                return `LATEST: ${r.player1_name} defeated ${r.player2_name} ${r.score1} - ${r.score2}`;
            } else if (r.score2 > r.score1) {
                return `LATEST: ${r.player2_name} defeated ${r.player1_name} ${r.score2} - ${r.score1}`;
            } else {
                return `LATEST: ${r.player1_name} and ${r.player2_name} drew ${r.score1} - ${r.score2}`;
            }
        });
    }, [results]);

    const pairingsByRound = useMemo(() => tournament?.pairing_schedule || {}, [tournament]);

    const tournamentStats = useMemo(() => {
        if (!results || results.length === 0) return {};
        const highGame = results.reduce((max, r) => Math.max(max, r.score1, r.score2), 0);
        const largestBlowout = results.reduce((max, r) => {
            const spread = Math.abs(r.score1 - r.score2);
            return spread > max.spread ? { ...r, spread } : max;
        }, { spread: -1 });
        return { highGame, largestBlowout };
    }, [results]);

    const getRecordDisplay = (player) => {
        const wins = player.wins || 0;
        const losses = player.losses || 0;
        const ties = player.ties || 0;
        const winPoints = wins + (ties * 0.5);
        const lossPoints = losses + (ties * 0.5);
        return `${winPoints} - ${lossPoints}`;
    };

    const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' });
    
    const sortedRoster = useMemo(() => {
        return [...players].sort((a, b) => {
            if (a.team_id < b.team_id) return -1;
            if (a.team_id > b.team_id) return 1;
            return (a.seed || 0) - (b.seed || 0);
        });
    }, [players]);

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading Tournament Portal...</p></div>;
    if (!tournament) return <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4"><Icon name="SearchX" size={64} className="text-destructive opacity-50 mb-4" /><h1 className="text-2xl font-heading font-bold text-foreground">Tournament Not Found</h1></div>;
    
    const formattedDate = tournament.date ? format(new Date(tournament.date), "MMMM do, yyyy") : "Date not set";

    const SidebarContent = () => (
        <div className="glass-card p-4 space-y-1">
            <h3 className="font-semibold px-3 pt-2 pb-1 text-muted-foreground text-sm">Live Index</h3>
            <Button variant="ghost" className="w-full justify-start" onClick={() => scrollToRef(standingsRef)}>
                <Icon name="Trophy" size={16} className="mr-3"/>Live Standings
            </Button>
            <div>
                <button onClick={() => setShowPairingsDropdown(!showPairingsDropdown)} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/10 transition-colors w-full text-left">
                    <div className="flex items-center space-x-3">
                        <Icon name="Swords" size={16} />
                        <span>Pairings</span>
                    </div>
                    <Icon name="ChevronDown" size={16} className={cn('transition-transform', showPairingsDropdown && 'rotate-180')} />
                </button>
                {showPairingsDropdown && (
                    <div className="pl-6 pt-1 pb-2 border-l border-border ml-5">
                        {Object.keys(pairingsByRound).sort((a, b) => parseInt(b) - parseInt(a)).map(roundNum => (
                            <a key={roundNum} href={`#round-${roundNum}`} onClick={(e) => { e.preventDefault(); scrollToRef({ current: document.getElementById(`round-${roundNum}`) }) }} className="flex p-2 rounded-lg hover:bg-muted/10 text-sm">
                                Round {roundNum}
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={() => scrollToRef(statsRef)}>
                <Icon name="BarChart2" size={16} className="mr-3"/>Stats
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => scrollToRef(rosterRef)}>
                <Icon name="Users" size={16} className="mr-3"/>Roster
            </Button>
            {tournament.is_remote_submission_enabled && (
                <div className="pt-2">
                    <Button onClick={() => setShowSubmissionModal(true)} className="w-full shadow-glow">
                        <Icon name="Send" className="mr-2" size={16}/>Submit Result
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Toaster position="top-center" richColors />
            <PlayerStatsModal player={selectedPlayer} results={results} onClose={() => setSelectedPlayer(null)} onSelectPlayer={(name) => setSelectedPlayer(players.find(p => p.name === name))} />
            <AnimatePresence>
                {showSubmissionModal && <ResultSubmissionModal tournament={tournament} players={players} onClose={() => setShowSubmissionModal(false)} />}
            </AnimatePresence>
            <TournamentTicker messages={tickerMessages} />
            
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border text-center bg-background py-4">
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gradient">{tournament.name}</h1>
                    <p className="text-muted-foreground mt-2">{tournament.venue} • {formattedDate}</p>
                </div>
            </header>
            
            <main className="pt-40 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <aside className="md:col-span-1 md:sticky top-32 self-start">
                            <SidebarContent />
                        </aside>
                        <div className="md:col-span-3 space-y-16">
                            <AnnouncementsDisplay />
                            <section id="standings" ref={standingsRef}>
                                {/* Standings Component will go here */}
                            </section>

                            <section id="pairings" ref={pairingsRef}>
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Swords" className="mr-3 text-primary"/>Pairings by Round</h2>
                                <div className="space-y-8">
                                    {Object.keys(pairingsByRound).sort((a, b) => parseInt(b) - parseInt(a)).map(roundNum => (
                                        <div key={roundNum} id={`round-${roundNum}`} className="glass-card">
                                            <h3 className="p-4 border-b border-border font-semibold text-lg">Round {roundNum}</h3>
                                            <div className="p-4 space-y-3">
                                                {pairingsByRound[roundNum].map(pairing => {
                                                    let p1Data = pairing.player1;
                                                    let p2Data = pairing.player2;
                                                    if (p2Data.starts) {
                                                        [p1Data, p2Data] = [p2Data, p1Data];
                                                    }
                                                    const p1Formatted = formatPlayerName(p1Data.name, players);
                                                    const p2Formatted = formatPlayerName(p2Data.name, players);
                                                    
                                                    return (
                                                        <div key={pairing.table} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between font-mono text-sm sm:text-base">
                                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                                <span className="font-bold text-primary w-4 text-center">{pairing.table}</span>
                                                                <button onClick={() => setSelectedPlayer(players.find(p => p.name === p1Data.name))} className="hover:underline text-left truncate">
                                                                    <span>{p1Formatted.formattedName}</span> <span className="text-muted-foreground">{p1Formatted.seedInfo}</span>
                                                                </button>
                                                                {p1Data.starts && <i className="text-xs text-primary not-italic">*first*</i>}
                                                            </div>
                                                            <div className="font-semibold text-muted-foreground mx-2">vs.</div>
                                                            <div className="flex items-center space-x-3 flex-1 min-w-0 text-right justify-end">
                                                                <button onClick={() => setSelectedPlayer(players.find(p => p.name === p2Data.name))} className="hover:underline text-left truncate">
                                                                    <span>{p2Formatted.formattedName}</span> {p2Data.name !== 'BYE' && <span className="text-muted-foreground">{p2Formatted.seedInfo}</span>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section id="stats" ref={statsRef}>
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="BarChart2" className="mr-3 text-primary"/>Tournament Statistics</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <StatCard icon="Star" label="High Game Score" value={tournamentStats.highGame || 'N/A'} />
                                    <StatCard icon="Maximize2" label="Largest Blowout" value={tournamentStats.largestBlowout?.spread > -1 ? `+${tournamentStats.largestBlowout.spread}` : 'N/A'} subtext={tournamentStats.largestBlowout?.spread > -1 ? `${tournamentStats.largestBlowout.player1_name} vs ${tournamentStats.largestBlowout.player2_name}` : ''}/>
                                </div>
                            </section>

                            <section id="roster" ref={rosterRef}>
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Users" className="mr-3 text-primary"/>Player Roster</h2>
                                <div className="glass-card p-4">
                                    <div className="divide-y divide-border">
                                        {sortedRoster.map(p => (
                                            <div key={p.id} className="p-3 flex justify-between items-center">
                                                <div className="flex items-center space-x-3">
                                                    <div>
                                                        <button onClick={() => setSelectedPlayer(p)} className="font-medium hover:underline">{p.name}</button>
                                                        {tournament.type === 'team' && p.team_id && (
                                                            <p className="text-xs text-accent">{teamMap.get(p.team_id) || 'Unknown Team'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-muted-foreground text-sm font-mono">{p.rating}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicTournamentPage;