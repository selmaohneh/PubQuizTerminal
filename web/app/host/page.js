import ControllerBoot from '../../components/ControllerBoot';

export const metadata = {
  title: 'PubQuizTerminal – Quizmaster'
};

// Quizmaster page. The markup mirrors what HostController (public/host.js)
// expects — it takes over the DOM once ControllerBoot has loaded the scripts.
export default function HostPage() {
  return (
    <div className="terminal">
      <h1>Quizmaster</h1>
      <p className="subtitle">Raum erstellen, Quiz laden, Spieler empfangen.</p>

      <div id="create-view">
        <button id="create-button">Raum erstellen</button>
        <p className="error" id="create-error"></p>
      </div>

      <div id="room-view" className="hidden">
        <h2>Raum-Code</h2>
        <div className="room-code" id="room-code"></div>

        <h2>Beitreten unter</h2>
        <p className="join-urls" id="join-urls"></p>

        <div id="game-view" className="hidden">
          <h2 id="game-title"></h2>

          <div id="topic-select">
            <p className="empty-hint">Thema auswählen:</p>
            <div className="topic-grid" id="topic-grid"></div>
          </div>

          <div id="question-panel" className="hidden">
            <p className="empty-hint" id="game-topic"></p>
            <p className="question-text" id="game-question"></p>
            <p className="empty-hint" id="game-progress"></p>
            <ul className="list" id="answer-status"></ul>
            <button type="button" id="reveal-button" disabled>Antwort freigeben</button>
            <div id="game-results" className="hidden">
              <h2>Auflösung</h2>
              <p className="question-answer" id="game-answer"></p>
              <ul className="list" id="results-list"></ul>
            </div>
            <button type="button" className="secondary" id="end-question-button">Zurück zur Themenwahl</button>
          </div>

          <div id="title-panel" className="hidden">
            <div className="title-screen">
              <p className="title-subtitle" id="title-subtitle-display"></p>
              <p className="title-main" id="title-display"></p>
            </div>
          </div>

          <div id="pair-panel" className="hidden">
            <div id="pair-board">
              <p className="empty-hint">Linkes Element wählen, dann das passende rechte Element.</p>
              <div className="board-columns">
                <div className="board-column" id="pair-left"></div>
                <div className="board-column board-center" id="pair-center"></div>
                <div className="board-column" id="pair-right"></div>
              </div>
            </div>
            <div id="pair-result" className="hidden">
              <p className="own-result" id="pair-result-verdict"></p>
              <h2>Alle Paare</h2>
              <ul className="list" id="pair-result-list"></ul>
            </div>
          </div>

          <div id="sort-panel" className="hidden">
            <div id="sort-board">
              <p className="empty-hint">Element wählen, dann eine Position im Graphen anklicken.</p>
              <div className="board-columns">
                <div className="board-column" id="sort-left"></div>
                <div className="board-column board-center" id="sort-center"></div>
                <div className="board-column" id="sort-right"></div>
              </div>
            </div>
            <div id="sort-result" className="hidden">
              <p className="own-result" id="sort-result-verdict"></p>
              <h2>Richtige Reihenfolge</h2>
              <ul className="list" id="sort-result-list"></ul>
            </div>
          </div>

          <div id="image-panel" className="hidden">
            <p className="empty-hint" id="image-progress"></p>
            <div className="image-display" id="image-display"></div>
            <p className="question-answer hidden" id="image-answer"></p>
            <button type="button" id="image-next-button">Weiter</button>
          </div>

          <button type="button" className="secondary" id="end-quiz-button">Quiz beenden</button>
        </div>

        <h2>Quiz laden</h2>
        <p className="empty-hint">Einzelne Quiz-Datei (JSON) oder ganzen Ordner als Playlist.</p>
        <input type="file" id="file-input" className="hidden"
               accept=".topicquiz,.pairquiz,.sortquiz,.imagequiz,.imagemutationquiz,.title" multiple />
        <input type="file" id="folder-input" className="hidden" webkitdirectory="" />
        <div className="file-row">
          <button type="button" className="secondary" id="open-file-button">Datei öffnen</button>
          <button type="button" className="secondary" id="open-folder-button">Ordner öffnen</button>
        </div>
        <p className="error" id="load-error"></p>

        <h2>Playlist</h2>
        <ul className="list" id="playlist"></ul>
        <p className="empty-hint" id="playlist-empty">Noch kein Quiz geladen.</p>

        <h2>Spieler (<span id="player-count">0</span>)</h2>
        <ul className="list" id="player-list"></ul>
        <p className="empty-hint" id="players-empty">Noch keine Spieler verbunden<span className="blink">_</span></p>

        <button type="button" className="secondary" id="close-button">Raum schließen</button>
        <p className="status-line" id="status-line">bereit</p>
      </div>

      <ControllerBoot
        scripts={['/vendor/supabase.js', '/config.js', '/room-protocol.js', '/quiz-validation.js', '/host.js']}
        controller="HostController"
      />
    </div>
  );
}
