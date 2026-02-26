import "../css/components/roomInfo.css";

function RoomInfo({ roomCode, username, users, ready, onReady }) {
  return (
    <div className="roomInfoContainer card">
      <h2 className="roomSubheading">Room Information</h2>
      {/* Main info */}
      <div className="infoBlock">
        <h3>Room Code:</h3>
        <p>{roomCode}</p>
      </div>
      <div className="infoBlock">
        <h3>Username:</h3>
        <p>{username}</p>
      </div>
      <div className="infoBlock">
        {/* List of all users and their status */}
        <h3>Users:</h3>
        <ul className="users">
          {[...users]
            .sort((a, b) =>
              a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
            )
            .map((user, index) => (
              <li key={index}>
                <span>
                  {user.username}
                  {user.username === username && (
                    <span className="youTag"> (You)</span>
                  )}
                </span>

                <span
                  className={`userStatus ${user.status ? "ready" : "notReady"}`}
                >
                  {user.status ? "Ready" : "Not Ready"}
                </span>
              </li>
            ))}
        </ul>
      </div>

      {/* Bottom to change status that later disappears */}
      <div>
        {!ready && (
          <button onClick={onReady} id="readyButton" className="fancyButton">
            I'm ready!
          </button>
        )}
      </div>
    </div>
  );
}

export default RoomInfo;
