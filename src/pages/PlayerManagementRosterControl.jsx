import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import DashboardSidebar from './tournament-command-center-dashboard/components/DashboardSidebar';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';
import PlayerStatsSummary from '../components/players/PlayerStatsSummary';
import BulkManagementTools from '../components/players/BulkManagementTools';
import PlayerSearchFilter from '../components/players/PlayerSearchFilter';
import PlayerListItem from '../components/players/PlayerListItem';
import PlayerEditModal from '../components/players/PlayerEditModal';
import ExportModal from '../components/players/ExportModal';
import AddPlayer from '../components/players/AddPlayer';
import { Toaster, toast } from 'sonner';
import { supabase } from '../supabaseClient';

const PlayerManagementRosterControl = () => {
    const { tournamentId } = useParams();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
  
    useEffect(() => {
      const fetchPlayers = async () => {
        if (!tournamentId) return;
        setLoading(true);
        const { data, error } = await supabase.from('tournaments').select('players').eq('id', tournamentId).single();
        if (error) {
          toast.error("Failed to load player data.");
        } else if (data) {
          setPlayers(data.players || []);
        }
        setLoading(false);
      };
      fetchPlayers();
    }, [tournamentId]);
    
    const filteredPlayers = useMemo(() => {
      if (!players) return [];
      return players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (statusFilter === 'all' || p.status === statusFilter));
    }, [players, searchTerm, statusFilter]);
  
    const playerStats = useMemo(() => {
      if (!players) return { total: 0, active: 0, inactive: 0, removed: 0 };
      return { total: players.length, active: players.filter(p => p.status === 'active').length, inactive: players.filter(p => p.status === 'inactive').length, removed: players.filter(p => p.status === 'removed').length };
    }, [players]);
  
    const updateRemotePlayers = async (newPlayers, successMessage) => {
        const { error } = await supabase.from('tournaments').update({ players: newPlayers, "playerCount": newPlayers.length }).eq('id', tournamentId);
        if (error) {
          toast.error("Failed to save player changes.");
        } else {
            setPlayers(newPlayers);
            if (successMessage) toast.success(successMessage);
        }
    };

    const handleAddSinglePlayer = (name) => {
        const newPlayer = { id: `P${(players || []).length + 1}`, name, status: 'active', wins: 0, losses: 0, spread: 0 };
        updateRemotePlayers([...(players || []), newPlayer], `Player "${name}" added.`);
    };
    
    const handleBulkAdd = (names) => {
        const newPlayers = names.map((name, index) => ({ id: `P${(players || []).length + index + 1}`, name, status: 'active', wins: 0, losses: 0, spread: 0 }));
        updateRemotePlayers([...(players || []), ...newPlayers], `${names.length} players added.`);
    };

    const handleSavePlayer = (updatedPlayer) => {
        const newPlayers = players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
        updateRemotePlayers(newPlayers, "Player details updated.");
        setEditingPlayer(null);
    };
    
    const handleRemovePlayer = (playerId) => {
        const newPlayers = players.filter(p => p.id !== playerId);
        updateRemotePlayers(newPlayers, "Player removed.");
    };

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading Players...</p></div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-right" richColors />
            <Header />
            <main className="pt-20 pb-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <DashboardSidebar tournamentId={tournamentId} />
                        <div className="md:col-span-3">
                            <div className="mb-8">
                                <h1 className="text-3xl font-heading font-bold text-gradient mb-2">Player Roster</h1>
                                <p className="text-muted-foreground">Add, edit, and manage all participants in this tournament.</p>
                            </div>
                            <PlayerStatsSummary stats={playerStats} />
                            <AddPlayer onAddPlayer={handleAddSinglePlayer} />
                            <BulkManagementTools onBulkAdd={handleBulkAdd} onCsvImport={handleBulkAdd} onBatchOperation={() => {}} />
                            <PlayerSearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); }} totalResults={filteredPlayers.length} />
                            <div className="glass-card mt-6">
                                <div className="divide-y divide-border">
                                    {filteredPlayers.length > 0 ? (
                                        filteredPlayers.map((player) => (
                                        <PlayerListItem key={player.id} player={player} onEdit={() => setEditingPlayer(player)} onRemove={handleRemovePlayer} isSelected={selectedPlayers.includes(player.id)} onSelect={() => {}} />
                                        ))
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground">No players found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <PlayerEditModal player={editingPlayer} isOpen={!!editingPlayer} onClose={() => setEditingPlayer(null)} onSave={handleSavePlayer} />
            <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
        </div>
    );
};

export default PlayerManagementRosterControl;