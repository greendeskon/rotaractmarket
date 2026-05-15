import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ParlayProvider } from "./context/ParlayContext";
import Login from "./pages/Login";
import Markets from "./pages/Markets";
import Leaderboard from "./pages/Leaderboard";
import Portfolio from "./pages/Portfolio";
import Admin from "./pages/Admin";
import MarketDetail from "./pages/MarketDetail";
import Navbar from "./components/Navbar";
import ParlayBar from "./components/ParlayBar";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ background: "#09090b", minHeight: "100vh" }} />;
    return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
    const { userData, loading } = useAuth();
    if (loading) return <div style={{ background: "#09090b", minHeight: "100vh" }} />;
    return userData?.role === "admin" ? children : <Navigate to="/markets" replace />;
}

function Shell({ children }) {
    return <><Navbar />{children}<ParlayBar /></>;
}

export default function App() {
    return (
        <BrowserRouter>
            <ParlayProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Shell><Markets /></Shell></ProtectedRoute>} />
                    <Route path="/markets" element={<ProtectedRoute><Shell><Markets /></Shell></ProtectedRoute>} />
                    <Route path="/markets/:id" element={<ProtectedRoute><Shell><MarketDetail /></Shell></ProtectedRoute>} />
                    <Route path="/leaderboard" element={<ProtectedRoute><Shell><Leaderboard /></Shell></ProtectedRoute>} />
                    <Route path="/portfolio" element={<ProtectedRoute><Shell><Portfolio /></Shell></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><Shell><Admin /></Shell></AdminRoute>} />
                    <Route path="*" element={<Navigate to="/markets" replace />} />
                </Routes>
            </ParlayProvider>
        </BrowserRouter>
    );
}