import React, { createContext, useContext, useState } from "react";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { ImCross } from "react-icons/im";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ text: "", type: "" });
  const [visible, setVisible] = useState(false);

  const showToast = (text, type) => {
    setToast({ text, type });
    setVisible(true);

    // Start hiding after 3 seconds
    setTimeout(() => {
      setVisible(false);
    }, 3000);

    // Remove the text after the slide-out animation finishes
    setTimeout(() => {
      setToast({ text: "", type: "" });
    }, 3600);
  };

  const toastIcons = {
    info: <IoIosInformationCircleOutline className="toastIcon" />,
    error: <ImCross className="toastIcon" />,
    alert: <AiOutlineExclamationCircle className="toastIcon" />,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${visible ? "show" : ""} ${toast.type}`}>
        <div>
          {/* <img src="/cross.png" alt="error" /> */}
          {toastIcons[toast.type]}
        </div>
        <div>
          <h1>
            {/* Capitalize the type */}
            {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
          </h1>
          <p>{toast.text}</p>
        </div>
      </div>
    </ToastContext.Provider>
  );
};
