import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  title: string;
  reason: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona%40example.com')
      .then((data) => setSuggestions(data.suggestions))
      .catch(() => setError('Unable to load workout suggestions'));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        {error ? (
          <p role="alert" className="text-danger">{error}</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions available.</p>
        ) : (
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                {suggestion.title} - {suggestion.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
