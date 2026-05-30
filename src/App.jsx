import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CityPage from './pages/CityPage.jsx';
import HomePage from './pages/HomePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/city/:cityName" element={<CityPage />} />
      </Routes>
    </BrowserRouter>
  );
}
