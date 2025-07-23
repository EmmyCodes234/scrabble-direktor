import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { toast } from 'sonner';

const PendingResults = ({ tournamentId, onApprove }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchPending = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_results')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        toast.error("Failed to fetch pending results.");
        console.error(error);
      } else {
        setPending(data);
      }
      setLoading(false);
    };

    fetchPending();

    const channel = supabase
      .channel(`pending-results-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_results', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          fetchPending(); // Re-fetch when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const handleReject = async (id) => {
    const { error } = await supabase
        .from('pending_results')
        .delete()
        .eq('id', id);
    if (error) {
        toast.error("Failed to reject result.");
    } else {
        toast.info("Result has been rejected.");
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading pending results...</div>;
  }

  return (
    <div className="glass-card">
        <div className="p-4 border-b border-border flex justify-between items-center">
             <h3 className="font-heading font-semibold text-foreground flex items-center space-x-2">
                <Icon name="Mail" size={18} className="text-primary" />
                <span>Pending Results</span>
            </h3>
            {pending.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {pending.length}
                </span>
            )}
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending results to review.</p>
            ) : (
                pending.map(p => (
                    <div key={p.id} className="bg-muted/10 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{p.player1_name} vs {p.player2_name}</p>
                                <p className="font-mono text-lg">{p.score1} - {p.score2}</p>
                                <p className="text-xs text-muted-foreground">Submitted by: {p.submitted_by_name}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleReject(p.id)}>
                                    <Icon name="X" size={16} />
                                </Button>
                                <Button size="sm" onClick={() => onApprove(p)}>
                                    <Icon name="Check" size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default PendingResults;