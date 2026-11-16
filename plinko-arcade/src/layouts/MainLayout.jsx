import Header from '../components/Header';
import Toasts from '../components/ui/Toasts';

export default function MainLayout({ children }) {
  return (
    <>
      <div className="app-shell h-screen max-h-screen w-full max-w-[1720px] mx-auto p-2 sm:p-2.5 flex flex-col gap-2 bg-[#0d091e] overflow-hidden select-none">
        <Header />
        {/* Main Content Area */}
        <main className="flex-1 min-h-0 items-stretch overflow-hidden">
          {children}
        </main>
      </div>
      <Toasts />
    </>
  );
}
