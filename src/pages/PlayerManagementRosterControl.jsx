import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/ui/Header';
import DashboardSidebar from './tournament-command-center-dashboard/components/DashboardSidebar';
import PlayerListItem from '../components/players/PlayerListItem';
import { Toaster, toast } from 'sonner';
import { supabase } from '../supabaseClient';
import Icon from '../components/AppIcon';
import PlayerStatsSummary from '../components/players/PlayerStatsSummary';
import ConfirmationModal from '../components/ConfirmationModal';

const PlayerManagementRosterControl = () => {
    const { tournamentId } = useParams();
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playerToRemove, setPlayerToRemove] = useState(null);

    const fetchPlayers = useCallback(async () => {
        if (!tournamentId) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('tournament_players')
            .select(`
                wins, losses, ties, spread, seed, rank, team_id,
                players (*)
            `)
            .eq('tournament_id', tournamentId);

        if (error) {
            toast.error("Failed to load player data.");
        } else {
            const { data: teamsData } = await supabase
                .from('teams')
                .select('id, name')
                .eq('tournament_id', tournamentId);
            
            setTeams(teamsData || []);
            const combinedPlayers = data.map(tp => ({ ...tp.players, ...tp, status: 'active' }));
            setPlayers(combinedPlayers);
        }
        setLoading(false);
    }, [tournamentId]);

    useEffect(() => {
      fetchPlayers();
    }, [fetchPlayers]);
    
    // --- SORTING LOGIC UPDATE ---
    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            // Sort by team_id first (nulls/unassigned will be grouped)
            if (a.team_id < b.team_id) return -1;
            if (a.team_id > b.team_id) return 1;
            // Then sort by seed within the team
            return (a.seed || 0) - (b.seed || 0);
        });
    }, [players]);

    const teamMap = useMemo(() => new Map(teams.map(team => [team.id, team.name])), [teams]);

    const playerStats = useMemo(() => {
        if (!players) return { total: 0, active: 0, inactive: 0, removed: 0 };
        return { 
            total: players.length, 
            active: players.length,
            inactive: 0, 
            removed: 0 
        };
    }, [players]);

    const handleRemovePlayer = async () => {
        if (!playerToRemove) return;
        
        const { error } = await supabase
            .from('tournament_players')
            .delete()
            .match({ tournament_id: tournamentId, player_id: playerToRemove.id });

        if (error) {
            toast.error(`Failed to remove player: ${error.message}`);
        } else {
            toast.success(`Player "${playerToRemove.name}" has been removed from the tournament.`);
            fetchPlayers();
        }
        setPlayerToRemove(null);
    };

    return (
        <div className="min-h-screen bg-background">
            <ConfirmationModal
                isOpen={!!playerToRemove}
                title="Remove Player"
                message={`Are you sure you want to remove "${playerToRemove?.name}" from this tournament?`}
                onConfirm={handleRemovePlayer}
                onCancel={() => setPlayerToRemove(null)}
                confirmText="Yes, Remove"
            />
            <Toaster position="top-right" richColors />
            <Header />
            <main className="pt-20 pb-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <DashboardSidebar tournamentId={tournamentId} />
                        <div className="md:col-span-3">
                            <div className="mb-8">
                                <h1 className="text-3xl font-heading font-bold text-gradient mb-2">Player Roster</h1>
                                <p className="text-muted-foreground">Manage all participants in this tournament.</p>
                            </div>
                            <PlayerStatsSummary stats={playerStats} />
                            
                            <div className="glass-card mt-6">
                                <div className="divide-y divide-border">
                                    {loading ? <p className="p-12 text-center text-muted-foreground">Loading Roster...</p> :
                                     sortedPlayers.length > 0 ? (
                                        sortedPlayers.map((player) => (
                                            <PlayerListItem 
                                                key={player.id} 
                                                player={player}
                                                teamName={player.team_id ? teamMap.get(player.team_id) : null}
                                                onRemove={() => setPlayerToRemove(player)}
                                            />
                                        ))
                                     ) : (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <Icon name="Users" size={48} className="mx-auto opacity-50 mb-4"/>
                                            <h4 className="font-heading font-semibold text-lg">No Players in Roster</h4>
                                            <p className="text-sm">Players added during setup will appear here.</p>
                                        </div>
                                     )
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PlayerManagementRosterControl;