import { Routes, Route } from "react-router-dom";
import Upload from "./pages/Upload";
import View from "./pages/View";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Upload />} />
      <Route path="/view/:id" element={<View />} />
    </Routes>
  );
}
