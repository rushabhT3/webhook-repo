import React, { useEffect, useState } from "react";
import "./App.css";

const apiUrl = process.env.REACT_APP_API_URL;

const formatEvent = (event) => {
  const { action, author, fromBranch, toBranch, timestamp } = event;
  const date = new Date(timestamp).toUTCString();

  switch (action) {
    case "PUSH":
      return `${author} pushed to ${toBranch} on ${date}`;
    case "PULL_REQUEST":
      return `${author} submitted a pull request from ${fromBranch} to ${toBranch} on ${date}`;
    case "MERGE":
      return `${author} merged branch ${fromBranch} to ${toBranch} on ${date}`;
    default:
      return "";
  }
};

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${apiUrl}/events`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // Parse JSON response
        console.log("Data received:", data); // Log the parsed data
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>GitHub Events</h1>
        <ul>
          {events.map((event) => (
            <li key={`${event.toBranch}-${event.timestamp}`}>
              {formatEvent(event)}
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
