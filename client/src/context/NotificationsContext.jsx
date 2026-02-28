import React, { createContext, useContext, useState } from "react";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { ImCross } from "react-icons/im";

const NotificationsContext = createContext();
export const useNotification = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }) => {
  const [notification, setNotification] = useState({ text: "", type: "" });
  const [visible, setVisible] = useState(false);

  const showNotification = (text, type) => {
    setNotification({ text, type });
    setVisible(true);

    // Start hiding after 3 seconds
    setTimeout(() => {
      setVisible(false);
    }, 3000);

    // Remove the text after the slide-out animation finishes
    setTimeout(() => {
      setNotification({ text: "", type: "" });
    }, 3600);
  };

  const notificationIcons = {
    info: <IoIosInformationCircleOutline className="notificationIcon" />,
    error: <ImCross className="notificationIcon" />,
    alert: <AiOutlineExclamationCircle className="notificationIcon" />,
  };

  return (
    <NotificationsContext.Provider value={{ showNotification }}>
      {children}
      <div
        className={`notification ${visible ? "show" : ""} ${notification.type}`}
      >
        <div>
          {/* <img src="/cross.png" alt="error" /> */}
          {notificationIcons[notification.type]}
        </div>
        <div>
          <h1>
            {/* Capitalize the type */}
            {notification.type.charAt(0).toUpperCase() +
              notification.type.slice(1)}
          </h1>
          <p>{notification.text}</p>
        </div>
      </div>
    </NotificationsContext.Provider>
  );
};
