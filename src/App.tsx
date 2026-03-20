
export default function App() {
  return (
    // En un SidePanel, w-full y h-screen llenan exactamente el panel lateral de Chrome
    <div className="w-screen min-h-screen bg-white text-black p-6 flex flex-col space-y-2">
      <h1 className="text-xl font-bold">Side Panel</h1>
      <p className="text-sm text-gray-500 mt-2">¡Configurado correctamente!</p>
    </div>
  );
}
