import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { supabase } from 'supabaseClient';
import PlayerStatsModal from 'components/PlayerStatsModal';
import ResultSubmissionModal from 'components/ResultSubmissionModal';
import Button from 'components/ui/Button';
import { cn } from 'utils/cn';
import { Toaster, toast } from 'sonner';

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

const PublicTournamentPage = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [recentlyUpdated, setRecentlyUpdated] = useState([]);
    const [showPairingsDropdown, setShowPairingsDropdown] = useState(false);

    const fetchPublicData = async () => {
        if (!tournamentId) {
            setLoading(false);
            return;
        }
        
        const { data: tournamentData, error: tournamentError } = await supabase
            .from('tournaments').select('*').eq('id', tournamentId).single();
        
        if (tournamentError) console.error("Error fetching tournament", tournamentError);
        else {
            setTournament(tournamentData);
            setPlayers(tournamentData.players || []);
        }

        const { data: resultsData, error: resultsError } = await supabase
            .from('results').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true });

        if (resultsError) console.error("Error fetching results", resultsError);
        else setResults(resultsData || []);
        
        setLoading(false);
    };
    
    useEffect(() => {
        fetchPublicData();
        
        const channel = supabase
            .channel(`public-results-${tournamentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter: `tournament_id=eq.${tournamentId}` }, (payload) => {
                fetchPublicData();
                const updatedId = payload.new?.id || payload.old?.id;
                if (updatedId) {
                    setRecentlyUpdated(prev => [...prev, updatedId]);
                    setTimeout(() => setRecentlyUpdated(arr => arr.filter(id => id !== updatedId)), 2000);
                }
            })
            .subscribe();
            
        return () => supabase.removeChannel(channel);
    }, [tournamentId]);
    
    const handleSelectPlayer = (playerName) => {
        const player = players.find(p => p.name === playerName);
        if(player) setSelectedPlayer(player);
    };

    const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.rank - b.rank), [players]);
    const alphabetizedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
    const resultsByRound = useMemo(() => {
        return results.reduce((acc, result) => {
            (acc[result.round] = acc[result.round] || []).push(result);
            return acc;
        }, {});
    }, [results]);

    const tournamentStats = useMemo(() => {
        if (results.length === 0) return {};
        const stats = {};
        
        // High Game Score
        stats.highGame = results.reduce((max, r) => Math.max(max, r.score1, r.score2), 0);
        
        // Largest Blowout & Closest Game
        let maxSpread = { spread: -1 }, minSpread = { spread: Infinity };
        results.forEach(r => {
            const spread = Math.abs(r.score1 - r.score2);
            if (spread > maxSpread.spread) maxSpread = { ...r, spread };
            if (spread > 0 && spread < minSpread.spread) minSpread = { ...r, spread };
        });
        stats.largestBlowout = maxSpread;
        stats.closestGame = minSpread.spread !== Infinity ? minSpread : null;

        // High-Scoring Loss
        stats.highLoss = results.reduce((highest, r) => {
            if (r.score1 < r.score2 && r.score1 > highest.score) return { player: r.player1_name, score: r.score1 };
            if (r.score2 < r.score1 && r.score2 > highest.score) return { player: r.player2_name, score: r.score2 };
            return highest;
        }, { score: 0 });

        // Biggest Upset
        stats.biggestUpset = results.reduce((biggest, r) => {
            const p1 = players.find(p => p.name === r.player1_name);
            const p2 = players.find(p => p.name === r.player2_name);
            if (!p1 || !p2 || !p1.rating || !p2.rating) return biggest;
            
            const ratingDiff = Math.abs(p1.rating - p2.rating);
            if (ratingDiff <= biggest.diff) return biggest;

            if ((p1.rating < p2.rating && r.score1 > r.score2) || (p2.rating < p1.rating && r.score2 > r.score1)) {
                return { diff: ratingDiff, winner: p1.rating < p2.rating ? p1.name : p2.name, loser: p1.rating < p2.rating ? p2.name : p1.name };
            }
            return biggest;
        }, { diff: -1 });

        return stats;
    }, [results, players]);


    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading Tournament Portal...</p></div>;
    if (!tournament) return <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4"><Icon name="SearchX" size={64} className="text-destructive opacity-50 mb-4" /><h1 className="text-2xl font-heading font-bold text-foreground">Tournament Not Found</h1></div>;

    return (
        <>
            <Toaster position="top-center" richColors />
            <PlayerStatsModal player={selectedPlayer} results={results} onClose={() => setSelectedPlayer(null)} onSelectPlayer={handleSelectPlayer} />
            {showSubmissionModal && <ResultSubmissionModal tournament={tournament} players={sortedPlayers} onClose={() => setShowSubmissionModal(false)} />}
            
            <div className="min-h-screen bg-background text-foreground">
                <header className="relative py-8 px-6 border-b border-border text-center bg-card/50">
                    {tournament.banner_url && <img src={tournament.banner_url} alt={`${tournament.name} Banner`} className="absolute inset-0 w-full h-full object-cover opacity-10" />}
                    <div className="relative z-10 max-w-7xl mx-auto">
                        <h1 className="text-4xl font-heading font-bold text-gradient">{tournament.name}</h1>
                        <p className="text-muted-foreground mt-2">{tournament.venue} • {new Date(tournament.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-success">
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            <span>Live • Round {tournament.currentRound || 1} of {tournament.rounds}</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <aside className="md:col-span-1 md:sticky top-24 self-start">
                            <div className="glass-card p-4 space-y-1">
                                <h3 className="font-semibold px-3 pt-2 pb-1 text-muted-foreground text-sm">Live Index</h3>
                                <a href="#standings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/10 transition-colors w-full text-left">
                                    <Icon name="Trophy" size={16} /><span>Live Standings</span>
                                </a>
                                <div>
                                    <button onClick={() => setShowPairingsDropdown(!showPairingsDropdown)} className="flex items-center justify-between space-x-3 p-3 rounded-lg hover:bg-muted/10 transition-colors w-full text-left">
                                        <div className="flex items-center space-x-3"><Icon name="Swords" size={16} /><span>Pairings by Round</span></div>
                                        <Icon name="ChevronDown" size={16} className={cn('transition-transform', showPairingsDropdown && 'rotate-180')} />
                                    </button>
                                    {showPairingsDropdown && (
                                        <div className="pl-6 pt-1 pb-2 border-l border-border ml-5">
                                            {Object.keys(resultsByRound).map(roundNum => (
                                                <a key={roundNum} href={`#round-${roundNum}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/10 transition-colors w-full text-left text-sm">
                                                    <span>Round {roundNum}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <a href="#stats" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/10 transition-colors w-full text-left">
                                   <Icon name="BarChart2" size={16} /><span>Tournament Stats</span>
                                </a>
                                <a href="#roster" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/10 transition-colors w-full text-left">
                                   <Icon name="Users" size={16} /><span>Player Roster</span>
                                </a>
                                 {tournament.is_remote_submission_enabled && (
                                    <div className="pt-2"><Button onClick={() => setShowSubmissionModal(true)} className="w-full shadow-glow"><Icon name="Send" className="mr-2" size={16}/>Submit Result</Button></div>
                                )}
                            </div>
                        </aside>

                        <main className="md:col-span-3 space-y-16">
                            <section id="standings">
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Trophy" className="mr-3 text-primary"/>Live Standings</h2>
                                <div className="glass-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/10"><th className="p-3 text-left font-semibold">Rank</th><th className="p-3 text-left font-semibold">Player</th><th className="p-3 text-center font-semibold">Record</th><th className="p-3 text-right font-semibold">Spread</th></tr></thead><tbody>{sortedPlayers.map((p, pIndex) => (<tr key={p.id} className={cn("border-b border-border/50 hover:bg-muted/10 transition-colors", pIndex % 2 === 1 && "bg-muted/5", recentlyUpdated.some(id => results.find(r => r.id === id && (r.player1_name === p.name || r.player2_name === p.name))) && 'flash-update')}><td className="p-3 font-mono text-base">{p.rank}</td><td className="p-3 font-medium text-base"><button onClick={() => handleSelectPlayer(p.name)} className="hover:underline">{p.name}</button></td><td className="p-3 text-center font-mono">{p.wins}-{p.losses}</td><td className={cn("p-3 text-right font-mono font-semibold", p.spread >= 0 ? 'text-success' : 'text-destructive')}>{p.spread > 0 ? '+' : ''}{p.spread}</td></tr>))}</tbody></table></div></div>
                            </section>

                            <section id="results">
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Swords" className="mr-3 text-primary"/>Results by Round</h2>
                                <div className="space-y-8">
                                    {Object.keys(resultsByRound).sort((a,b) => b-a).map(roundNum => (
                                        <div key={roundNum} id={`round-${roundNum}`} className="glass-card">
                                            <h3 className="p-4 border-b border-border font-semibold text-lg">Round {roundNum} Results</h3>
                                            <div className="p-4 space-y-3">
                                                {resultsByRound[roundNum].map(result => (
                                                    <div key={result.id} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
                                                        <button onClick={() => handleSelectPlayer(result.player1_name)} className="hover:underline">{result.player1_name}</button>
                                                        <span className="font-mono px-4">{result.score1} - {result.score2}</span>
                                                        <button onClick={() => handleSelectPlayer(result.player2_name)} className="hover:underline text-right">{result.player2_name}</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            
                            <section id="stats">
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="BarChart2" className="mr-3 text-primary"/>Tournament Statistics</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StatCard icon="Star" label="High Game Score" value={tournamentStats.highGame || 'N/A'} subtext={players.find(p => results.some(r => r.player1_name === p.name && r.score1 === tournamentStats.highGame || r.player2_name === p.name && r.score2 === tournamentStats.highGame))?.name} />
                                    {tournamentStats.closestGame && <StatCard icon="Minimize2" label="Closest Game" value={`+${tournamentStats.closestGame.spread}`} subtext={`${tournamentStats.closestGame.player1_name} vs ${tournamentStats.closestGame.player2_name}`} />}
                                    {tournamentStats.largestBlowout && <StatCard icon="Maximize2" label="Largest Blowout" value={`+${tournamentStats.largestBlowout.spread}`} subtext={`${tournamentStats.largestBlowout.player1_name} vs ${tournamentStats.largestBlowout.player2_name}`} />}
                                    {tournamentStats.highLoss?.score > 0 && <StatCard icon="Award" label="High-Scoring Loss" value={tournamentStats.highLoss.score} subtext={tournamentStats.highLoss.player} />}
                                    {tournamentStats.biggestUpset?.diff > -1 && <StatCard icon="TrendingUp" label="Biggest Upset" value={`+${tournamentStats.biggestUpset.diff} Rating`} subtext={`${tournamentStats.biggestUpset.winner} over ${tournamentStats.biggestUpset.loser}`} />}
                                </div>
                            </section>

                            <section id="roster">
                                <h2 className="font-heading text-2xl font-semibold mb-4 flex items-center"><Icon name="Users" className="mr-3 text-primary"/>Player Roster</h2>
                                <div className="glass-card">
                                    <div className="grid grid-cols-2 gap-x-4 p-4">
                                        {alphabetizedPlayers.map(p => (
                                            <div key={p.id} className="p-2 border-b border-border/50 flex justify-between items-center">
                                                <button onClick={() => handleSelectPlayer(p.name)} className="hover:underline">{p.name}</button>
                                                <span className="text-muted-foreground text-sm">{p.rating || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </main>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PublicTournamentPage;