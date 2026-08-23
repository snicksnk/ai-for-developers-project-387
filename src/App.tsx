import { Routes, Route } from "react-router-dom";
import { GuestPage } from "@/pages/guest/GuestPage";
import { OwnerPage } from "@/pages/owner/OwnerPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestPage />} />
      <Route path="/guest" element={<GuestPage />} />
      <Route path="/owner" element={<OwnerPage />} />
    </Routes>
  );
}

export default App;
