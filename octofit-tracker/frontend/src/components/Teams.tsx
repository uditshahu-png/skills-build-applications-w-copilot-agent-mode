import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  name: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch(() => setError('Unable to load teams'));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        {error ? (
          <p role="alert" className="text-danger">{error}</p>
        ) : teams === null ? (
          <p role="status">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p>No teams available.</p>
        ) : (
          <ul>
            {teams.map((team, index) => (
              <li key={index}>
                {team.name}
                {team.members.length > 0 && <> - {team.members.join(', ')}</>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
