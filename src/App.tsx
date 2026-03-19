import { useInputsData } from './hooks/useInputsData';
import { FormElements } from './components/FormElements';

export default function App() {
  const { inputsHTML, formValues, handleInputChange } = useInputsData();
  function FillForm() {
    console.log(formValues);
  }

  return (
    // En un SidePanel, w-full y h-screen llenan exactamente el panel lateral de Chrome
    <div className="w-screen min-h-screen bg-white text-black p-6 flex flex-col space-y-2">
      <h1 className="text-xl font-bold">Side Panel</h1>
      <p className="text-sm text-gray-500 mt-2">¡Configurado correctamente!</p>


      <div className="flex flex-col space-y-5 pt-10 pr-3 pb-5">
        <FormElements inputsHTML={inputsHTML} formValues={formValues} handleInputChange={handleInputChange} />
      </div>

      <button onClick={FillForm} className='bg-blue-500 text-white px-4 py-2 rounded-md'>Guardar Datos</button>
    </div>
  );
}
