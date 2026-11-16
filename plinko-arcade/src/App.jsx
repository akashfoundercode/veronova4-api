import { GameProvider } from './context/GameContext';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <GameProvider>
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </GameProvider>
  );
}
