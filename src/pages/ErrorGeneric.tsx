export default function ErrorGeneric() {
  return (
    <div>
      <style>
        {`
          .div_error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }
        `}
      </style>
      <div className='div_error'>
        <h4>Ocorreu um erro inesperado!</h4>
        <p>Contate o Administrador do sistema para mais detalhes.</p>
      </div>
    </div>
  );
}
