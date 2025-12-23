const authLogout = () => {
  window.dispatchEvent(new Event("oauth2:logout"));
};

export default authLogout;
