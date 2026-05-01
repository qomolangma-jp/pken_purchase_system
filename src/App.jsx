import React from 'react';
import Header from './components/Header';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DebugLogger from './components/DebugLogger';
import Register from './pages/Register';
import Login from './pages/Login';
import LineCallback from './pages/LineCallback';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderComplete from './pages/OrderComplete';
import PurchaseHistory from './pages/PurchaseHistory';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Header />
        {/* 開発環境でのみデバッグログを表示 */}
        <DebugLogger />
        <main style={{ paddingTop: '56px' }}>
          <Routes>
          {/* 認証が必要なルート */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProductList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-complete"
            element={
              <ProtectedRoute>
                <OrderComplete />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-history"
            element={
              <ProtectedRoute>
                <PurchaseHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/news"
            element={
              <ProtectedRoute>
                <News />
              </ProtectedRoute>
            }
          />
          <Route
            path="/news/:id"
            element={
              <ProtectedRoute>
                <NewsDetail />
              </ProtectedRoute>
            }
          />
          {/* 公開ルート（認証不要） */}
          <Route
            path="/register"
            element={<Register />}
          />
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/auth/callback"
            element={<LineCallback />}
          />
          </Routes>
        </main>
      </AuthProvider>
    </Router>
  );
}

// Verification: Ensure App is exported correctly
if (typeof App !== 'function') {
  console.error('🔴 CRITICAL ERROR: App is not a function!', typeof App, App);
}

export default App;
