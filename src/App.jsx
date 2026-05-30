import { firebaseApp } from './firebase.js';

export default function App() {
  const { projectId } = firebaseApp.options;

  return (
    <main className="app">
      <h1>Dira-Behanach</h1>
      <p className="firebase-status">
        Connected to Firebase project: <code>{projectId}</code>
      </p>
    </main>
  );
}
