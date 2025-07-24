import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import TournamentLobby from "pages/TournamentLobby";
import TournamentSetupConfiguration from "pages/tournament-setup-configuration";
import TournamentCommandCenterDashboard from "pages/tournament-command-center-dashboard";
import PublicTournamentPage from "pages/PublicTournamentPage";
import RegistrationPage from "./pages/RegistrationPage";
import NotFound from "pages/NotFound";
import PlayerManagementRosterControl from "./pages/PlayerManagementRosterControl";
import TournamentSettingsAdministration from "./pages/TournamentSettingsAdministration";
import ReportsPage from "./pages/ReportsPage";
import PairingManagementPage from "./pages/PairingManagementPage";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        <Route path="/" element={<TournamentLobby />} />
        <Route path="/tournament-setup-configuration" element={<TournamentSetupConfiguration />} />
        
        {/* Public Routes */}
        <Route path="/tournaments/:tournamentId/register" element={<RegistrationPage />} />
        <Route path="/tournaments/:tournamentId/live" element={<PublicTournamentPage />} />
        
        {/* Admin Routes */}
        <Route path="/tournament/:tournamentId/dashboard" element={<TournamentCommandCenterDashboard />} />
        <Route path="/tournament/:tournamentId/players" element={<PlayerManagementRosterControl />} />
        <Route path="/tournament/:tournamentId/settings" element={<TournamentSettingsAdministration />} />
        <Route path="/tournament/:tournamentId/reports" element={<ReportsPage />} />
        <Route path="/tournament/:tournamentId/pairings" element={<PairingManagementPage />} />

        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;