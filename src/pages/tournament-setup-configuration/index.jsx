import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import TournamentDetailsForm from './components/TournamentDetailsForm';
import RoundsConfiguration from './components/RoundsConfiguration';
import PlayerRosterManager from './components/PlayerRosterManager';
import SetupProgress from './components/SetupProgress';
import Icon from '../../components/AppIcon';
import { Toaster, toast } from 'sonner';
import { supabase } from '../../supabaseClient';
import Button from '../../components/ui/Button';

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

const TournamentSetupConfiguration = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const draftId = query.get('draftId');

  const [currentStep, setCurrentStep] = useState('details');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', venue: '', date: '', rounds: 8, playerNames: '', playerCount: 0
  });

  useEffect(() => {
    if (draftId) {
        const fetchDraft = async () => {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', draftId)
                .single();
            if (error) {
                toast.error("Could not load the specified draft.");
            } else {
                setFormData({
                    name: data.name || '',
                    venue: data.venue || '',
                    date: data.date || '',
                    rounds: data.rounds || 8,
                    playerNames: data.playerNames || '',
                    playerCount: data.playerCount || 0
                });
                toast.info("Continuing a saved draft.");
            }
        };
        fetchDraft();
    }
  }, [draftId]);

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'playerNames') {
        newState.playerCount = value.split('\n').filter(name => name.trim() !== '').length;
      }
      return newState;
    });
  };

  const handleNextStep = () => {
    if (currentStep === 'details') setCurrentStep('players');
    if (currentStep === 'players') setCurrentStep('rounds');
  };

  const handlePrevStep = () => {
    if (currentStep === 'rounds') setCurrentStep('players');
    if (currentStep === 'players') setCurrentStep('details');
  };

  const handleSaveOrUpdateDraft = async () => {
      const draftData = {
        ...formData,
        status: 'draft',
        players: formData.playerNames.split('\n').filter(name => name.trim()).map((name, index) => ({ id: index + 1, name: name.trim(), wins: 0, losses: 0, spread: 0, rank: index + 1 }))
      };

      if (draftId) {
          // Update existing draft
          const { error } = await supabase.from('tournaments').update(draftData).eq('id', draftId);
          if (error) toast.error("Failed to update draft.");
          else toast.success("Draft updated successfully!");
      } else {
          // Insert new draft
          const { data, error } = await supabase.from('tournaments').insert([draftData]).select().single();
          if (error) toast.error("Failed to save draft.");
          else {
              toast.success("Draft saved successfully!");
              navigate(`/tournament-setup-configuration?draftId=${data.id}`);
          }
      }
  };

  const handleCreateTournament = async () => {
    setIsLoading(true);
    try {
        const finalData = {
            ...formData,
            status: 'setup', // Finalize status
            players: formData.playerNames.split('\n').filter(name => name.trim()).map((name, index) => ({ id: index + 1, name: name.trim(), wins: 0, losses: 0, spread: 0, rank: index + 1 }))
        };

        const { data, error } = await supabase
            .from('tournaments')
            .update(finalData)
            .eq('id', draftId) // Update the existing draft record
            .select()
            .single();

        if (error) throw error;
        toast.success('Tournament created successfully!');
        setTimeout(() => navigate(`/tournament/${data.id}/dashboard`), 1000);
    } catch (error) {
        toast.error(`Failed to create tournament: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <Header />
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl font-heading font-bold text-gradient mb-4">
              New Tournament Wizard
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
                <SetupProgress currentStep={currentStep} onStepClick={setCurrentStep} />
                <div className="mt-4">
                    <Button variant="outline" className="w-full" onClick={handleSaveOrUpdateDraft}>
                        <Icon name="Save" className="mr-2" size={16}/>
                        Save Draft
                    </Button>
                </div>
            </div>
            <div className="md:col-span-3">
                {currentStep === 'details' && <TournamentDetailsForm formData={formData} onChange={handleFormChange} errors={{}} />}
                {currentStep === 'players' && <PlayerRosterManager formData={formData} onChange={handleFormChange} errors={{}} />}
                {currentStep === 'rounds' && <RoundsConfiguration formData={formData} onChange={handleFormChange} errors={{}} />}
                <div className="mt-8 flex justify-between items-center">
                    {currentStep !== 'details' ? (<Button variant="outline" onClick={handlePrevStep}>Back</Button>) : <div />}
                    {currentStep !== 'rounds' ? (<Button onClick={handleNextStep}>Next</Button>) : (<Button onClick={handleCreateTournament} loading={isLoading} disabled={!draftId}>Finalize & Create</Button>)}
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TournamentSetupConfiguration;