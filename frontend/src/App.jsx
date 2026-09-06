import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import BottomTabs from "./components/BottomTabs.jsx";
import WinnerAnnouncement from "./components/WinnerAnnouncement.jsx";
import WinPopup from "./components/WinPopup.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Games from "./pages/Games.jsx";
import GameDetail from "./pages/GameDetail.jsx";
import Wallet from "./pages/Wallet.jsx";
import Deposit from "./pages/Deposit.jsx";
import Withdraw from "./pages/Withdraw.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import Profile from "./pages/Profile.jsx";
import Invite from "./pages/Invite.jsx";
import Admin from "./pages/Admin.jsx";
import AdminGames from "./pages/AdminGames.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminDeposits from "./pages/AdminDeposits.jsx";
import AdminWithdrawals from "./pages/AdminWithdrawals.jsx";

export default function App() {
  const { user, authReady } = useAuth();

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      {user && <WinPopup />}
      {user && <WinnerAnnouncement />}
      <div className={user ? "pb-20" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              !authReady ? null : user ? (
                <ProtectedRoute>
                  <Games />
                </ProtectedRoute>
              ) : (
                // The app is bot-first now — a logged-out web visitor gets
                // pointed at the Telegram bot instead of a signup form.
                // Admins still sign in normally via /login.
                <Landing />
              )
            }
          />
          <Route
            path="/games/:gameId"
            element={
              <ProtectedRoute>
                <GameDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deposit"
            element={
              <ProtectedRoute>
                <Deposit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/withdraw"
            element={
              <ProtectedRoute>
                <Withdraw />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite"
            element={
              <ProtectedRoute>
                <Invite />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/edit/:id"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/games"
            element={
              <ProtectedRoute adminOnly>
                <AdminGames />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/deposits"
            element={
              <ProtectedRoute adminOnly>
                <AdminDeposits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute adminOnly>
                <AdminWithdrawals />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      {user && <BottomTabs />}
    </div>
  );
}
