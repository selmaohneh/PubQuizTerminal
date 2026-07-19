import ControllerBoot from '../components/ControllerBoot';

export const metadata = {
  title: 'PubQuizTerminal – Beitreten'
};

// Player join page. The markup mirrors what JoinController (public/join.js)
// expects — it takes over the DOM once ControllerBoot has loaded the scripts.
export default function JoinPage() {
  return (
    <div className="terminal">
      <h1>PubQuizTerminal</h1>
      <p className="subtitle">Dein Smartphone wird zum Quiz-Terminal.</p>

      <form id="join-form">
        <label htmlFor="code">Raum-Code</label>
        <input type="text" id="code" className="code-input" maxLength={4} autoComplete="off"
               autoCapitalize="characters" spellCheck={false} placeholder="XXXX" required />

        <label htmlFor="name">Dein Name</label>
        <input type="text" id="name" maxLength={20} autoComplete="off" spellCheck={false}
               placeholder="Name eingeben" required />

        <button type="submit" id="join-button">Beitreten</button>
        <p className="error" id="join-error"></p>
      </form>

      <div id="waiting" className="waiting-screen hidden">
        <h2>Verbunden mit Raum <span id="joined-code"></span></h2>
        <p className="player-name" id="joined-name"></p>

        <div id="lobby-view">
          <p>Warte auf den Quizmaster<span className="blink">_</span></p>
          <h2>Spieler im Raum</h2>
          <ul className="list" id="player-list"></ul>
        </div>

        <div id="topics-view" className="hidden">
          <h2 id="topics-quiz-name"></h2>
          <p>Der Quizmaster wählt ein Thema<span className="blink">_</span></p>
          <ul className="list" id="topics-list"></ul>
        </div>

        <div id="question-view" className="hidden">
          <h2 id="question-topic">Frage</h2>
          <p className="question-text" id="question-text"></p>

          <form id="answer-form">
            <label htmlFor="answer">Deine Antwort</label>
            <input type="text" id="answer" autoComplete="off" spellCheck={false}
                   placeholder="Antwort eingeben" />
            <button type="submit" id="answer-button">Antwort tippen</button>
          </form>
          <p className="empty-hint" id="answer-status-line"></p>

          <div id="result-view" className="hidden">
            <p className="own-result" id="own-result"></p>
            <p className="question-answer" id="correct-answer"></p>
            <h2>Alle Antworten</h2>
            <ul className="list" id="results-list"></ul>
          </div>
        </div>

        <div id="title-view" className="hidden">
          <div className="title-screen">
            <p className="title-subtitle" id="title-subtitle"></p>
            <p className="title-main" id="title-main"></p>
          </div>
        </div>

        <div id="pair-view" className="hidden">
          <h2 id="pair-quiz-name"></h2>
          <div id="pair-mirror">
            <p>Der Quizmaster ordnet zu<span className="blink">_</span></p>
            <h2>Gefundene Paare</h2>
            <ul className="list" id="pair-matched-list"></ul>
            <div className="board-columns">
              <div className="board-column" id="pair-mirror-left"></div>
              <div className="board-column" id="pair-mirror-right"></div>
            </div>
          </div>
          <div id="pair-mirror-result" className="hidden">
            <p className="own-result" id="pair-mirror-verdict"></p>
            <h2>Alle Paare</h2>
            <ul className="list" id="pair-mirror-pairs"></ul>
          </div>
        </div>

        <div id="sort-view" className="hidden">
          <h2 id="sort-quiz-name"></h2>
          <div id="sort-mirror">
            <p>Der Quizmaster sortiert<span className="blink">_</span></p>
            <div className="sort-mirror-graph" id="sort-mirror-graph"></div>
            <h2>Noch einzusortieren</h2>
            <ul className="list" id="sort-remaining-list"></ul>
          </div>
          <div id="sort-mirror-result" className="hidden">
            <p className="own-result" id="sort-mirror-verdict"></p>
            <h2>Richtige Reihenfolge</h2>
            <ul className="list" id="sort-mirror-order"></ul>
          </div>
        </div>

        <div id="image-view" className="hidden">
          <h2 id="image-quiz-name"></h2>
          <p className="empty-hint" id="image-mirror-progress"></p>
          <div className="image-display" id="image-mirror-display"></div>
          <p className="question-answer hidden" id="image-mirror-answer"></p>
        </div>

        <p className="status-line" id="status-line">verbunden</p>
      </div>

      <ControllerBoot
        scripts={['/vendor/supabase.js', '/config.js', '/room-protocol.js', '/join.js']}
        controller="JoinController"
      />
    </div>
  );
}
