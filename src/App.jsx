import { useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MODES = {
  nova: {
    name: "NOVA",
    icon: "✦",
    description: "Research ideas, investigate problems, and explore new possibilities.",
  },
  builder: {
    name: "BUILDER",
    icon: "⌘",
    description: "Transform your ideas into practical software and working projects.",
  },
  tester: {
    name: "TESTER",
    icon: "◈",
    description: "Find bugs, inspect code, and improve reliability.",
  },
};

const SUGGESTIONS = [
  {
    icon: "✧",
    title: "Discover an invention",
    description: "Explore a problem worth solving.",
    prompt: "Help me discover a unique invention I can start building with almost no budget.",
  },
  {
    icon: "⌘",
    title: "Build something",
    description: "Turn an idea into working software.",
    prompt: "Help me build a useful software project step by step.",
  },
  {
    icon: "◎",
    title: "Understand a concept",
    description: "Learn difficult topics clearly.",
    prompt: "Explain how artificial intelligence works, starting from the fundamentals.",
  },
  {
    icon: "↗",
    title: "Explore possibilities",
    description: "Research solutions and opportunities.",
    prompt: "Identify an important real-world problem and explore possible solutions.",
  },
];

export default function App() {
  const [page, setPage] = useState("chat");
  const [mode, setMode] = useState("nova");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text },
    ]);

    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.reply || "No response received.",
        },
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Connection error: ${err.message}. Check whether the backend is running on port 3001.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function searchWeb(event) {
    event.preventDefault();

    const query = input.trim();

    if (!query || loading) return;

    setLoading(true);
    setError("");
    setSearchResults(null);

    try {
      const response = await fetch(`${API}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed.");
      }

      setSearchResults(data);
      setInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadNews() {
    if (loading) return;

    setPage("news");
    setLoading(true);
    setError("");
    setNews([]);

    try {
      const response = await fetch(`${API}/api/news`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load news.");
      }

      setNews(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setError("");
    setInput("");
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setError("");
    setPage("chat");
  }

  const currentMode = MODES[mode];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar">
        <button className="brand" onClick={newChat}>
          <span className="brand-icon">✦</span>

          <span className="brand-copy">
            <strong>NOVA <span>×</span> EMPTY AI</strong>
            <small>INTELLIGENCE WORKSPACE</small>
          </span>
        </button>

        <div className="sidebar-section">
          <button className="new-chat" onClick={newChat}>
            <span>＋</span>
            <span>New conversation</span>
            <kbd>⌘ K</kbd>
          </button>
        </div>

        <div className="sidebar-section">
          <p className="menu-label">WORKSPACE</p>

          <button
            className={`nav-button ${page === "chat" ? "active" : ""}`}
            onClick={() => changePage("chat")}
          >
            <span className="nav-icon">✧</span>
            <span>AI Chat</span>
            <span className="nav-arrow">↗</span>
          </button>

          <button
            className={`nav-button ${page === "search" ? "active" : ""}`}
            onClick={() => changePage("search")}
          >
            <span className="nav-icon">⌕</span>
            <span>Web Search</span>
            <span className="nav-arrow">↗</span>
          </button>

          <button
            className={`nav-button ${page === "news" ? "active" : ""}`}
            onClick={loadNews}
          >
            <span className="nav-icon">◷</span>
            <span>Latest News</span>
            <span className="nav-arrow">↗</span>
          </button>
        </div>

        <div className="sidebar-section">
          <p className="menu-label">INTELLIGENCE MODES</p>

          {Object.entries(MODES).map(([key, item]) => (
            <button
              key={key}
              className={`mode-button ${mode === key && page === "chat" ? "selected" : ""}`}
              onClick={() => {
                setMode(key);
                setPage("chat");
                setError("");
              }}
            >
              <span className={`mode-icon mode-${key}`}>
                {item.icon}
              </span>

              <span className="mode-copy">
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>

              {mode === key && page === "chat" && (
                <span className="selected-dot" />
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-spacer" />

        <div className="system-card">
          <div className="system-card-top">
            <span className="system-symbol">◈</span>
            <span>YOUR WORKSPACE</span>
          </div>

          <div className="system-status">
            <span className="status-dot" />
            <span>Ready for discovery</span>
          </div>

          <p>Your next idea could change everything.</p>
        </div>

        <div className="sidebar-footer">
          <div className="profile-avatar">N</div>

          <div className="profile-copy">
            <strong>NOVA WORKSPACE</strong>
            <small>Personal intelligence lab</small>
          </div>

          <span className="profile-menu">···</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-heading">
            <span className="topbar-small">YOUR CREATIVE SPACE</span>

            <h2>
              {page === "chat"
                ? currentMode.name
                : page === "search"
                  ? "Web Search"
                  : "AI & Technology News"}
            </h2>
          </div>

          <div className="topbar-right">
            <div className="connection-badge">
              <span className="status-dot" />
              <span>WORKSPACE ONLINE</span>
            </div>

            <div className="topbar-divider" />

            <div className="topbar-mark">✦</div>
          </div>
        </header>

        <section className="content-area">
          {page === "chat" && (
            <>
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="core-wrap">
                    <div className="core-orbit orbit-one" />
                    <div className="core-orbit orbit-two" />
                    <div className="core-orbit orbit-three" />

                    <div className="core-glow" />

                    <div className="nova-core">
                      <span>✦</span>
                    </div>

                    <span className="core-point point-one" />
                    <span className="core-point point-two" />
                    <span className="core-point point-three" />
                  </div>

                  <div className="welcome-label">
                    <span className="welcome-label-line" />
                    YOUR IDEAS, AMPLIFIED
                    <span className="welcome-label-line" />
                  </div>

                  <h1>
                    Think beyond
                    <br />
                    <span>the possible.</span>
                  </h1>

                  <p className="welcome-description">
                    A space to question the ordinary, explore the unknown,
                    <br className="desktop-break" />
                    and transform your thinking into something real.
                  </p>

                  <div className="welcome-divider">
                    <span />
                    <small>WHERE WILL YOU BEGIN?</small>
                    <span />
                  </div>

                  <div className="suggestions">
                    {SUGGESTIONS.map((item) => (
                      <button
                        className="suggestion-card"
                        key={item.title}
                        onClick={() => setInput(item.prompt)}
                      >
                        <span className="suggestion-icon">
                          {item.icon}
                        </span>

                        <span className="suggestion-copy">
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>

                        <span className="suggestion-arrow">↗</span>
                      </button>
                    ))}
                  </div>

                  <div className="active-mode">
                    <span className="active-mode-icon">
                      {currentMode.icon}
                    </span>

                    <span>
                      <strong>{currentMode.name}</strong>
                      <small>{currentMode.description}</small>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="messages">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.role}`}
                    >
                      <div className="message-avatar">
                        {message.role === "user"
                          ? "YOU"
                          : currentMode.icon}
                      </div>

                      <div className="message-body">
                        <div className="message-heading">
                          <strong>
                            {message.role === "user"
                              ? "You"
                              : currentMode.name}
                          </strong>

                          <span>
                            {message.role === "user"
                              ? "YOUR MESSAGE"
                              : "AI RESPONSE"}
                          </span>
                        </div>

                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="loading-text">
                      <span className="loading-spinner" />
                      <span>{currentMode.name} is thinking...</span>
                    </div>
                  )}

                  {error && (
                    <p className="error-message">{error}</p>
                  )}
                </div>
              )}

              <form className="input-box" onSubmit={sendMessage}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Ask ${currentMode.name} anything...`}
                  rows={2}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                <div className="input-bottom">
                  <span className="input-hint">
                    <span>✧</span>
                    Built for curious minds
                    <span className="hint-divider">·</span>
                    Shift + Enter for new line
                  </span>

                  <button
                    className="send-button"
                    type="submit"
                    disabled={loading || !input.trim()}
                  >
                    <span>{loading ? "Thinking..." : "Send message"}</span>
                    <span className="send-arrow">
                      {loading ? "···" : "↗"}
                    </span>
                  </button>
                </div>
              </form>

              <p className="input-disclaimer">
                NOVA × EMPTY AI can make mistakes. Verify important information.
              </p>
            </>
          )}

          {page === "search" && (
            <div className="tool-page">
              <div className="tool-heading">
                <div className="tool-icon">⌕</div>

                <p className="eyebrow">KNOW MORE. DISCOVER MORE.</p>

                <h1>
                  Explore the
                  <br />
                  <span>world of information.</span>
                </h1>

                <p>
                  Search the web and explore useful sources for your next idea.
                </p>
              </div>

              <form className="search-form" onSubmit={searchWeb}>
                <span className="search-icon">⌕</span>

                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="What do you want to discover?"
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                >
                  {loading ? "Searching..." : "Search ↗"}
                </button>
              </form>

              {error && (
                <p className="error-message">{error}</p>
              )}

              {loading && (
                <p className="loading-text">
                  <span className="loading-spinner" />
                  Searching for useful information...
                </p>
              )}

              {searchResults && (
                <div className="result-list">
                  {searchResults.answer && (
                    <div className="result-card summary-card">
                      <span className="result-label">AI SUMMARY</span>
                      <h3>What we found</h3>
                      <p>{searchResults.answer}</p>
                    </div>
                  )}

                  {searchResults.results?.map((result, index) => (
                    <div
                      className="result-card"
                      key={`${result.url}-${index}`}
                    >
                      <span className="result-label">
                        SOURCE {String(index + 1).padStart(2, "0")}
                      </span>

                      <h3>
                        {result.title || result.url}
                      </h3>

                      <p>{result.content}</p>

                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source ↗
                      </a>
                    </div>
                  ))}

                  {searchResults.results?.length === 0 && (
                    <p>No results found. Try another search.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {page === "news" && (
            <div className="tool-page">
              <div className="tool-heading">
                <div className="tool-icon">◷</div>

                <p className="eyebrow">STAY AHEAD OF TOMORROW</p>

                <h1>
                  The future,
                  <br />
                  <span>in the present.</span>
                </h1>

                <p>
                  Explore recent artificial intelligence and technology news.
                </p>
              </div>

              <div className="news-toolbar">
                <span>AI & TECHNOLOGY UPDATES</span>

                <button
                  className="refresh-button"
                  onClick={loadNews}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>

              {error && (
                <p className="error-message">{error}</p>
              )}

              {loading && news.length === 0 && !error && (
                <p className="loading-text">
                  <span className="loading-spinner" />
                  Loading latest news...
                </p>
              )}

              {!loading && news.length === 0 && !error && (
                <p className="empty-results">
                  No news available right now. Try refreshing.
                </p>
              )}

              <div className="result-list">
                {news.map((item, index) => (
                  <div
                    className="result-card"
                    key={`${item.url}-${index}`}
                  >
                    <span className="result-label">
                      TECH UPDATE {String(index + 1).padStart(2, "0")}
                    </span>

                    <h3>{item.title || "Technology news"}</h3>

                    <p>{item.content}</p>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read full story ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="main-footer">
          <span>
            <span className="footer-star">✦</span>
            NOVA × EMPTY AI
          </span>

          <span>BUILT FOR IDEAS THAT MATTER.</span>
        </footer>
      </main>
    </div>
  );
}