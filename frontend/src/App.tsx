import './App.css';
import ReleasedVersions from './components/ReleasedVersions/ReleasedVersions';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">ShipIt</div>
      </header>
      <main className="app-content">
        <ReleasedVersions />
      </main>
    </div>
  );
};

export default App;
