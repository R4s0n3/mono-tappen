import { Navigate, Route, Routes } from "react-router-dom";

import { screens } from "./screens";

export function App() {
  return (
    <>
      <div id="modal-hook" />
      <Routes>
        {screens.map((screen) => (
          <Route key={screen.path} path={screen.path} element={screen.element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
