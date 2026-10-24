import { Routes, Route } from "react-router-dom";
import { HargaProvider } from "./config/HargaContext";
import Shell from "./components/Shell";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./routes/Landing";
import Studio from "./routes/Studio";
import Proyek from "./routes/Proyek";
import Panduan from "./routes/Panduan";
import Skema from "./routes/Skema";
import Harga from "./routes/Harga";
import Lisensi from "./routes/Lisensi";
import Privasi from "./routes/Privasi";
import Admin from "./routes/Admin";
import Bayar from "./routes/Bayar";

export default function App() {
  return (
    <ErrorBoundary>
      <HargaProvider>
        <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/bayar/:ref" element={<Bayar />} />
      <Route path="/bayar/:ref/sukses" element={<Bayar />} />
      <Route element={<Shell />}>
        <Route path="/studio" element={<Studio />} />
        <Route path="/proyek" element={<Proyek />} />
        <Route path="/panduan" element={<Panduan />} />
        <Route path="/skema" element={<Skema />} />
        <Route path="/harga" element={<Harga />} />
        <Route path="/lisensi" element={<Lisensi />} />
        <Route path="/privasi" element={<Privasi />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
      </HargaProvider>
    </ErrorBoundary>
  );
}
