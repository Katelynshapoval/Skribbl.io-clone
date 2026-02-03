import React, { useState, useEffect, useRef } from "react";

function Error({ message, className }) {
  return (
    <div className={className}>
      <div>
        <img src="cross.png" alt="" srcset="" />
      </div>
      <div>
        <h1>Error</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default Error;
