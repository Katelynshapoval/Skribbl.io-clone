import React, { createContext, useContext, useState } from "react";

const ErrorContext = createContext();
export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);

  const showError = (message) => {
    setError(message);
    setVisible(true);

    // Start hiding after 3 seconds
    setTimeout(() => {
      setVisible(false);
    }, 3000);

    // Remove the text after the slide-out animation finishes
    setTimeout(() => {
      setError(null);
    }, 3600);
  };

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && (
        <div className={`errorToast ${visible ? "show" : ""}`}>
          <div>
            <img src="/cross.png" alt="error" />
          </div>
          <div>
            <h1>Error</h1>
            <p>{error}</p>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
};
