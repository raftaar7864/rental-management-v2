// ManagerBuildings.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";

export default function ManagerBuildings() {
  const { user } = useContext(AuthContext);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    async function fetchBuildings() {
      try {
        const res = await axios.get(`/buildings/manager/${user.id}`);
        setBuildings(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    if (user) fetchBuildings();
  }, [user]);

  return (
    <div>
      <h2>My Buildings</h2>
      <ul>
        {buildings.map((b) => (
          <li key={b._id}>{b.name}</li>
        ))}
      </ul>
    </div>
  );
}
