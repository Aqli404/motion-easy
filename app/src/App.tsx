import { Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import Landing from "./routes/Landing";
import Studio from "./routes/Studio";
import Proyek from "./routes/Proyek";
import Panduan from "./routes/Panduan";
import Skema from "./routes/Skema";
import Harga from "./routes/Harga";
import Lisensi from "./routes/Lisensi";
import Privasi from "./routes/Privasi";
import Admin from "./routes/Admin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<Admin />} />
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
  );
}
