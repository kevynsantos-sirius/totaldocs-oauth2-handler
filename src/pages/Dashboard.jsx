import useAuth from "../auth/useAuth";

export default function Dashboard() {
  const { auth, logout } = useAuth();

  if (!auth) return <p>Você não está logado</p>;

  return (
    <div>
      <h1>Bem-vindo!</h1>
      <p>AccessToken: {auth.accessToken}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
