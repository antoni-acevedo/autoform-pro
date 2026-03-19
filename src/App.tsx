import { useState } from 'react';

export default function App() {
  return (
    // En un SidePanel, w-full y h-screen llenan exactamente el panel lateral de Chrome
    <div className="w-full h-screen bg-white text-black p-6 flex flex-col">
      <h1 className="text-xl font-bold">Side Panel</h1>
      <p className="text-sm text-gray-500 mt-2">¡Configurado correctamente!</p>
    </div>
  );
}
