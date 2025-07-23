import React, { useState, useEffect } from 'react';
import Header from '../components/ui/Header';
import { useParams } from 'react-router-dom';
import DashboardSidebar from './tournament-command-center-dashboard/components/DashboardSidebar';
import { supabase } from '../supabaseClient';
import { toast, Toaster } from 'sonner';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const pairingSystems = [
    {
        id: 'swiss',
        name: 'Swiss',
        description: 'Players are paired against opponents with the same or a similar win-loss record. This is the most common system for Scrabble tournaments.',
        whenToUse: 'Ideal for large tournaments where not everyone can play each other. It effectively finds a winner over a limited number of rounds.',
        whenNotToUse: 'Not suitable for small, intimate groups where a full round-robin is feasible.'
    },
    {
        id: 'round_robin',
        name: 'Round Robin',
        description: 'Every player plays against every other player a set number of times. The winner is the player with the best record after all games are complete.',
        whenToUse: 'Best for small tournaments (typically under 12 players) to determine the truest champion, as everyone faces the same opponents.',
        whenNotToUse: 'Impractical for large tournaments as the number of rounds required becomes extremely high.'
    },
    {
        id: 'king_of_the_hill',
        name: 'King of the Hill (KOTH)',
        description: 'Winners continue to play winners, creating high-stakes matchups at the top tables. It quickly elevates top-performing players.',
        whenToUse: 'Excellent for creating excitement and decisive top-table clashes, especially in the middle to late rounds of a tournament.',
        whenNotToUse: 'Can be harsh for players who have one bad game, as it can be difficult to climb back to the top tables.'
    },
    {
        id: 'quartile',
        name: 'Quartile Pairing',
        description: 'The tournament field is divided into four quarters (quartiles) based on rating or rank. Players are primarily paired against others within their own quartile.',
        whenToUse: 'Useful for ensuring players have a balanced schedule against opponents of similar skill levels throughout the tournament.',
        whenNotToUse: 'May prevent interesting cross-sectional matchups between players of different initial skill levels.'
    },
     {
        id: 'fonte_swiss',
        name: 'Fonte-Swiss',
        description: 'A hybrid system where players in the top half of the standings are paired like King of the Hill, while players in the bottom half are paired like Swiss.',
        whenToUse: 'A great way to ensure top players face each other while still providing fair matchups for the rest of the field.',
        whenNotToUse: 'May feel complex for very small tournaments where a simpler system would suffice.'
    },
     {
        id: 'random',
        name: 'Random',
        description: 'All pairings are generated completely at random, without regard to player records or ratings.',
        whenToUse: 'Only for casual, non-competitive events or for the very first round of a tournament before any records have been established.',
        whenNotToUse: 'Completely unsuitable for any serious or rated competitive tournament after the first round.'
    },
    {
        id: 'lito',
        name: 'Lito Pairings',
        description: 'A proprietary modified Swiss system designed to be fairer by keeping more players in contention for prizes for as long as possible.',
        whenToUse: 'Excellent for high-stakes tournaments with multiple prizes, as it reduces the impact of luck-of-the-draw in early rounds.',
        whenNotToUse: 'The complexity may be unnecessary for casual events.'
    }
];

const PairingManagementPage = () => {
    const { tournamentId } = useParams();
    const [settings, setSettings] = useState({ pairing_system: 'swiss', rr_meetings: 1 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('tournaments')
                .select('pairing_system, rr_meetings')
                .eq('id', tournamentId)
                .single();
            if (error) {
                toast.error("Failed to load pairing settings.");
            } else if (data) {
                setSettings({
                    pairing_system: data.pairing_system || 'swiss',
                    rr_meetings: data.rr_meetings || 1
                });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [tournamentId]);

    const handleSave = async () => {
        const { error } = await supabase
            .from('tournaments')
            .update({ 
                pairing_system: settings.pairing_system,
                rr_meetings: settings.rr_meetings
            })
            .eq('id', tournamentId);
        if (error) {
            toast.error("Failed to save settings.");
        } else {
            toast.success("Pairing settings updated successfully!");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-center" richColors />
            <Header />
            <main className="pt-20 pb-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <DashboardSidebar tournamentId={tournamentId} />
                        <div className="md:col-span-3">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h1 className="text-3xl font-heading font-bold text-gradient mb-2">Pairings Management</h1>
                                    <p className="text-muted-foreground">Configure the pairing algorithms for this tournament.</p>
                                </div>
                                <Button onClick={handleSave}>Save Changes</Button>
                            </div>

                            {settings.pairing_system === 'round_robin' && (
                                <div className="glass-card p-6 mb-6 animate-fade-in">
                                    <h3 className="font-semibold text-lg text-foreground mb-2">Round Robin Settings</h3>
                                    <Input
                                        label="Number of meetings"
                                        type="number"
                                        value={settings.rr_meetings}
                                        onChange={(e) => setSettings({...settings, rr_meetings: parseInt(e.target.value, 10) || 1})}
                                        description="How many times each player will play every other opponent."
                                        min="1"
                                        max="5"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {pairingSystems.map(system => (
                                    <div 
                                        key={system.id} 
                                        className={`glass-card p-4 rounded-lg cursor-pointer border-2 ${settings.pairing_system === system.id ? 'border-primary shadow-glow' : 'border-transparent hover:border-primary/50'}`}
                                        onClick={() => setSettings({ ...settings, pairing_system: system.id })}
                                    >
                                        <h3 className="font-semibold text-lg text-foreground">{system.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-2">{system.description}</p>
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <p className="text-xs font-semibold text-success">Use when:</p>
                                            <p className="text-xs text-muted-foreground">{system.whenToUse}</p>
                                            <p className="text-xs font-semibold text-destructive mt-2">Avoid when:</p>
                                            <p className="text-xs text-muted-foreground">{system.whenNotToUse}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PairingManagementPage;