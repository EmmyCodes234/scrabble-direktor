import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'sonner';
import ConfirmationModal from '../components/ConfirmationModal';

const TournamentLobby = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const navigate = useNavigate();

  const fetchTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments:', error);
      toast.error("Failed to load tournaments.");
    } else {
      setTournaments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleSelectTournament = (tournament) => {
    if (tournament.status === 'draft') {
        navigate(`/tournament-setup-configuration?draftId=${tournament.id}`);
    } else {
        navigate(`/tournament/${tournament.id}/dashboard`);
    }
  };

  const handleShareTournament = (tournamentId) => {
    const url = `${window.location.origin}/tournaments/${tournamentId}/live`;
    navigator.clipboard.writeText(url).then(() => {
        toast.success("Public link copied to clipboard!");
    }, (err) => {
        toast.error("Failed to copy link.");
        console.error('Could not copy text: ', err);
    });
  };

  const openDeleteConfirm = (tournament) => {
    setTournamentToDelete(tournament);
    setShowConfirmModal(true);
  };

  const handleDeleteTournament = async () => {
    if (!tournamentToDelete) return;

    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentToDelete.id);
    
    if (error) {
        toast.error(`Failed to delete tournament: ${error.message}`);
    } else {
        toast.success(`Tournament "${tournamentToDelete.name}" has been deleted.`);
        fetchTournaments();
    }

    setShowConfirmModal(false);
    setTournamentToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading Tournaments...</p>
      </div>
    );
  }
  
  const officialTournaments = tournaments.filter(t => t.status !== 'draft');
  const draftTournaments = tournaments.filter(t => t.status === 'draft');

  return (
    <>
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete Tournament"
        message={`Are you sure you want to permanently delete "${tournamentToDelete?.name}"? All associated data will be lost.`}
        onConfirm={handleDeleteTournament}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Yes, Delete"
      />
      <div className="min-h-screen bg-background">
        <Toaster position="top-center" richColors />
        <Header />
        <main className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-heading font-bold text-gradient">Tournament Lobby</h1>
              <Button onClick={() => navigate('/tournament-setup-configuration')} iconName="Plus" iconPosition="left">
                New Tournament
              </Button>
            </div>
            
            {draftTournaments.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Drafts</h2>
                    <div className="space-y-4">
                        {draftTournaments.map((tourney) => (
                             <div key={tourney.id} className="glass-card p-4 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
                                <div>
                                    <h3 className="font-semibold text-foreground">{tourney.name || "Untitled Tournament"}</h3>
                                    <p className="text-sm text-muted-foreground">Draft saved on {new Date(tourney.created_at).toLocaleDateString()}</p>
                                </div>
                                <Button variant="outline" onClick={() => handleSelectTournament(tourney)}>Continue Setup</Button>
                             </div>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="text-xl font-semibold mb-4 text-muted-foreground">My Tournaments</h2>
            <div className="space-y-4">
              {officialTournaments.length > 0 ? (
                officialTournaments.map((tourney) => (
                  <div key={tourney.id} className="glass-card p-4 flex flex-wrap items-center justify-between hover:shadow-glow transition-shadow gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{tourney.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tourney.players?.length || 0} players • {tourney.rounds} rounds • Status: {tourney.status}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleShareTournament(tourney.id)} className="text-muted-foreground hover:text-primary">
                        <Icon name="Link" size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(tourney)} className="text-muted-foreground hover:text-destructive">
                        <Icon name="Trash2" size={16} />
                      </Button>
                      <Button variant="outline" onClick={() => handleSelectTournament(tourney)}>Manage</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center glass-card p-12">
                  <Icon name="Trophy" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No tournaments found</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    Get started by creating your first tournament.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default TournamentLobby;