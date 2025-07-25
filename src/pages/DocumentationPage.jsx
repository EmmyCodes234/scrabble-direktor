import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/ui/Header';
import Icon from '../components/AppIcon';
import { motion } from 'framer-motion';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/Accordion';

const DocSection = ({ title, children }) => (
    <section className="mb-12">
        <h2 className="text-3xl font-heading font-bold text-gradient mb-6 pb-2 border-b border-border">{title}</h2>
        <div className="prose prose-invert max-w-none text-muted-foreground leading-loose">
            {children}
        </div>
    </section>
);

const DocumentationPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="pt-24 pb-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl mx-auto px-6"
                >
                    <div className="text-center mb-16">
                        <Icon name="BookOpen" size={48} className="mx-auto text-primary mb-4" />
                        <h1 className="text-5xl font-heading font-bold text-foreground">Direktor Documentation</h1>
                        <p className="text-lg text-muted-foreground mt-4">Your complete guide to running world-class Scrabble tournaments.</p>
                    </div>

                    <DocSection title="Getting Started: Your First Tournament">
                        <p>Welcome to Direktor! This guide will walk you through creating and managing your first tournament from start to finish. The core principle of Direktor is a <strong>Guided Workflow</strong>, meaning the app will always present you with the logical next step, making tournament management intuitive and stress-free.</p>
                    </DocSection>

                    <DocSection title="Tournament Setup Wizard">
                        <p>Creating a tournament is a simple 3-step process using our wizard.</p>
                        <ol>
                            <li><strong>Details:</strong> Enter the basic information for your tournament, such as the name, venue, and date.</li>
                            <li><strong>Player Roster:</strong> Add your players. You can paste a list or upload a CSV file. Direktor features a powerful <strong>Master Player Library</strong>.</li>
                            <li><strong>Rounds:</strong> Set the number of rounds for your event.</li>
                        </ol>
                        
                        <h3 className="text-xl font-heading font-semibold text-foreground mt-8 mb-4">The Player Reconciliation System</h3>
                        <p>To prevent duplicates, Direktor uses a "Review and Reconcile" system when you import players. After importing your list, you will be taken to a screen where you can:</p>
                        <ul>
                            <li><strong>Link to Existing Players:</strong> If a player from your list is already in the Master Library, you can link them. This pulls in their existing data like rating and photo.</li>
                            <li><strong>Create New Players:</strong> If a player is new, a new profile will be created for them in the Master Library, so you'll never have to enter their details again.</li>
                        </ul>
                    </DocSection>

                    <DocSection title="The Tournament Dashboard">
                        <p>Once your tournament is created, the Dashboard is your command center. It is context-aware and will only show you the controls you need at any given moment.</p>
                        <Accordion type="single" collapsible className="w-full mt-6">
                            <AccordionItem value="pairing">
                                <AccordionTrigger>Pairing a Round</AccordionTrigger>
                                <AccordionContent>
                                    When a round has not yet been paired, the "Command Deck" will show a large button to "Pair & Start Round". The system will automatically use the pairing strategy you defined in the settings.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="scores">
                                <AccordionTrigger>Entering Scores</AccordionTrigger>
                                <AccordionContent>
                                    Once a round is paired, the Command Deck will display the matchups for that round. Click "Enter Score" next to a match to open the score entry modal. You can edit a score at any time, even from previous rounds, by clicking on a player in the Live Standings to view their game history.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="next-round">
                                <AccordionTrigger>Proceeding to the Next Round</AccordionTrigger>
                                <AccordionContent>
                                    After all scores for the current round have been entered, a "Round Complete" card will appear with a button to "Proceed to Round X". Clicking this will advance the tournament to the next round.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </DocSection>
                    
                    <DocSection title="Advanced Pairing Strategy">
                        <p>Direktor gives you unparalleled control over your tournament's structure via the <strong>Pairings Strategy</strong> page in the tournament settings.</p>
                        <ul>
                            <li><strong>Default System:</strong> Set a single pairing system (e.g., Swiss, KOTH) for the entire event.</li>
                            <li><strong>Advanced Mode:</strong> Enable this to configure each round individually. For each round, you can set:</li>
                            <ul>
                                <li>The pairing system to use for that specific round.</li>
                                <li>Which previous round's standings to base the pairing on (e.g., you can pair Rounds 2 and 3 based on initial seeding instead of results).</li>
                                <li>Whether to allow rematches or not.</li>
                            </ul>
                        </ul>
                    </DocSection>
                </motion.div>
            </main>
        </div>
    );
};

export default DocumentationPage;