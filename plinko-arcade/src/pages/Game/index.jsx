import BoardPanel from '../../components/BoardPanel';
import RightPanel from '../../components/RightPanel';

export default function GamePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[46%_54%] gap-2.5 sm:gap-3 h-full min-h-0">
      <BoardPanel />
      <RightPanel />
    </div>
  );
}
