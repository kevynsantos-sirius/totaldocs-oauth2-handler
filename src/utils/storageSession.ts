export const getTokenSession = () => {
    const auth = localStorage.getItem("auth");
    let token = null;
    if(!auth)
    {
        return token;
    }
    
    try
    {
        const json = JSON.parse(auth);

        token = json.accessToken;
    }
    catch(e)
    {
        throw new Error("Ocorreu um erro durante a busca do token da sessao"+e);
    }

    return token;
}