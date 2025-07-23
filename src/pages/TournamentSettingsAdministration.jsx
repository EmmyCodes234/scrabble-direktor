import React, { useState, useEffect } from 'react';
import Header from '../components/ui/Header';
import { useParams } from 'react-router-dom';
import DashboardSidebar from './tournament-command-center-dashboard/components/DashboardSidebar';
import TournamentConfigSection from '../components/settings/TournamentConfigSection';
import PlayerManagementSection from '../components/settings/PlayerManagementSection';
import ScoringParametersSection from '../components/settings/ScoringParametersSection';
import SystemPreferencesSection from '../components/settings/SystemPreferencesSection';
import EmergencyControlsSection from '../components/settings/EmergencyControlsSection';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'sonner';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

const ShareSection = ({ tournamentId }) => {
    const publicUrl = `${window.location.origin}/tournaments/${tournamentId}/live`;

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl).then(() => {
            toast.success("Public link copied to clipboard!");
        });
    };

    return (
        <div className="glass-card p-6">
            <h3 className="font-heading font-semibold text-lg mb-4 flex items-center space-x-2">
                <Icon name="Share2" size={20} className="text-primary" />
                <span>Share Tournament</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Use this link to share the public-facing tournament page with players and spectators.</p>
            <div className="flex items-center space-x-2 p-2 bg-input rounded-lg">
                <input type="text" readOnly value={publicUrl} className="flex-1 bg-transparent text-muted-foreground text-sm focus:outline-none" />
                <Button onClick={handleCopy} size="sm">Copy Link</Button>
            </div>
        </div>
    );
};

const TournamentSettingsAdministration = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();
            if (error) {
                toast.error("Failed to load tournament settings.");
            } else {
                setTournament(data);
            }
            setLoading(false);
        };
        fetchTournament();
    }, [tournamentId]);

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-center" richColors />
            <Header />
            <main className="pt-20 pb-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <DashboardSidebar tournamentId={tournamentId} />
                        <div className="md:col-span-3 space-y-8">
                            <div>
                                <h1 className="text-3xl font-heading font-bold text-gradient mb-2">Settings</h1>
                                <p className="text-muted-foreground">Manage tournament rules, permissions, and system preferences.</p>
                            </div>
                            {loading ? (
                                <p className="text-muted-foreground">Loading settings...</p>
                            ) : (
                                <>
                                    <ShareSection tournamentId={tournamentId} />
                                    <TournamentConfigSection tournament={tournament} />
                                    <PlayerManagementSection />
                                    <ScoringParametersSection />
                                    <SystemPreferencesSection />
                                    <EmergencyControlsSection />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TournamentSettingsAdministration;