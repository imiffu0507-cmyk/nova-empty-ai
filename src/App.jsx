import { useState, useRef, useEffect } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const STORAGE_KEY = "nova_conversation";

export default function App() {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [reply, message]);

  // Detect response language for voice
  const getVoiceLanguage = (text) => {
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return "ta-IN";
    }

    return "en-IN";
  };

  // NOVA VOICE
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = getVoiceLanguage(text);
    speech.rate = 0.95;
    speech.pitch = 1.05;
    speech.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const selectedVoice = voices.find(
      (voice) =>
        voice.lang.toLowerCase() ===
        speech.lang.toLowerCase()
    );

    if (selectedVoice) {
      speech.voice = selectedVoice;
    }

    window.speechSynthesis.speak(speech);
  };

  // SEND MESSAGE
  const sendMessage = async (text) => {
    const cleanText = text.trim();

    if (!cleanText || loading) return;

    setLoading(true);
    setError("");
    setMessage(cleanText);
    setReply("");

    const updatedHistory = [
      ...history,
      {
        role: "user",
        content: cleanText,
      },
    ];

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanText,
          mode: "nova",
          history: updatedHistory.slice(-12, -1),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "NOVA could not respond."
        );
      }

      const answer =
        data.reply || data.message || "No response received.";

      setReply(answer);

      const finalHistory = [
        ...updatedHistory,
        {
          role: "model",
          content: answer,
        },
      ];

      setHistory(finalHistory);

      speak(answer);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // VOICE INPUT
  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice recognition is not supported. Please use Google Chrome."
      );
      return;
    }

    setError("");

    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const text =
        event.results[0][0].transcript;

      setMessage(text);
      sendMessage(text);
    };

    recognition.onerror = (event) => {
      setListening(false);

      setError(
        event.error === "not-allowed"
          ? "Please allow microphone access."
          : "Voice recognition failed. Please try again."
      );
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      setError("Microphone could not start. Try again.");
    }
  };

  // STOP NOVA VOICE
  const stopVoice = () => {
    window.speechSynthesis.cancel();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setListening(false);
  };

  // NEW CONVERSATION
  const newConversation = () => {
    stopVoice();
    setHistory([]);
    setMessage("");
    setReply("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(message);
    setMessage("");
  };

  return (
    <div className="nova-app">

      <nav className="navbar">

        <div className="brand">
          <span className="brand-symbol">✦</span>
          <span>NOVA</span>
          <span className="brand-divider">×</span>
          <span className="brand-light">VOICE AI</span>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          PERSONAL INTELLIGENCE
        </div>

        <button
          className="menu-button"
          onClick={newConversation}
          title="New conversation"
        >
          ↻
        </button>

      </nav>

      <main className="hero">

        <div className="hero-label">
          <span className="label-line"></span>
          YOUR WORLD, IN YOUR VOICE
          <span className="label-line"></span>
        </div>

        <h1>
          Meet the voice
          <br />
          <span>of your future.</span>
        </h1>

        <p className="hero-description">
          An intelligence that listens, understands,
          <br />
          and moves with you.
        </p>

        <div className={`nova-orb ${listening ? "listening" : ""}`}>

          <div className="orb-ring ring-one"></div>
          <div className="orb-ring ring-two"></div>
          <div className="orb-ring ring-three"></div>

          <div className="orb-core">
            <div className="orb-light"></div>
            <span>✦</span>
          </div>

          <div className="orb-caption">
            {listening
              ? "LISTENING..."
              : loading
              ? "THINKING..."
              : "NOVA IS HERE"}
          </div>

        </div>

        <div className="language-selector">
          <label htmlFor="nova-language">
            VOICE LANGUAGE
          </label>

          <select
            id="nova-language"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value)
            }
          >
            <option value="en-IN">English</option>
            <option value="ta-IN">தமிழ்</option>
          </select>
        </div>

        <button
          className="talk-button"
          onClick={listening ? stopVoice : startVoice}
          disabled={loading}
        >
          <span className="mic-icon">🎙</span>

          {listening
            ? "Stop listening"
            : loading
            ? "Thinking..."
            : "Talk to NOVA"}

          <span className="button-arrow">↗</span>
        </button>

        <div className="hero-note">
          <span className="note-dot"></span>

          {listening
            ? "Speak naturally. NOVA is listening."
            : loading
            ? "NOVA is thinking..."
            : "Your personal AI · Always ready"}
        </div>

        <div className="feature-row">

          <div className="feature">
            <span className="feature-icon">◉</span>
            <div>
              <h3>Understands</h3>
              <p>Your voice, your way</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">✧</span>
            <div>
              <h3>Thinks</h3>
              <p>Beyond the ordinary</p>
            </div>
          </div>

          <div className="feature">
            <span className="feature-icon">⌘</span>
            <div>
              <h3>Remembers</h3>
              <p>Your conversations</p>
            </div>
          </div>

        </div>

        <div className="chat-box">

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Talk to NOVA... Ask anything."
              disabled={loading || listening}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
            >
              Send ↗
            </button>
          </form>

        </div>

        {message && (
          <div className="voice-response">
            <p>YOU</p>
            <div>{message}</div>
          </div>
        )}

        {reply && (
          <div className="voice-response">
            <p>✦ NOVA</p>
            <div>{reply}</div>

            <button
              onClick={() => speak(reply)}
              type="button"
            >
              🔊 Listen again
            </button>
          </div>
        )}

        {error && (
          <div className="voice-response">
            <p>NOTICE</p>
            <div>{error}</div>
          </div>
        )}

        <div ref={bottomRef}></div>

      </main>

      <footer className="footer">
        <span>NOVA × EMPTY AI</span>
        <span>INTELLIGENCE, IN YOUR HANDS</span>
      </footer>

    </div>
  );
}