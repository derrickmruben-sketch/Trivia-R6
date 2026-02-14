import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ================= THEME =================
// Dark blue accessible palette (>= 4.5:1 contrast with white text)
const theme = {
  bg: "bg-[#0b1220]",
  panel: "bg-[#111a2e]",
  panelAlt: "bg-[#16213a]",
  border: "border-[#22304f]",
  text: "text-white",
  textDim: "text-blue-200",
  accent: "bg-blue-600 hover:bg-blue-500",
};

// ===== BACKEND PLACEHOLDER (SWAP LATER) =====
const fakeDB = {
  users: [],
  scores: {},
  sessions: {},
};

function apiRegister(user) {
  fakeDB.users.push(user);
  fakeDB.scores[user.username] = {
    total: 0,
    tier: {},
    callouts: 0,
    answered: 0,
    correct: 0,
  };
  return user;
}

function apiAddScore(username, mode, tier, points, correct) {
  const s = fakeDB.scores[username];
  if (!s) return;
  s.answered++;
  if (correct) s.correct++;

  if (mode === "ranked" && correct) {
    s.total += points;
    s.tier[tier] = (s.tier[tier] || 0) + points;
  }
  if (mode === "callouts" && correct) {
    s.callouts += points;
  }
}

function apiGetScores(username) {
  return fakeDB.scores[username];
}

// ===== QUESTION DATA MODEL (ENGINE FOUNDATION) =====
const QUESTION_BANK = [
  {
    id: 1,
    mode: "ranked",
    tier: "tier4",
    points: 1,
    q: "How many operators are on a standard team?",
    a: "Five",
  },
  {
    id: 2,
    mode: "ranked",
    tier: "tier3",
    points: 2,
    q: "What gadget destroys defender electronics in its radius?",
    a: "Thatcher EMP",
  },
  {
    id: 3,
    mode: "ranked",
    tier: "tier2",
    points: 3,
    q: "Name the defender with Black Eye cameras.",
    a: "Valkyrie",
  },
  {
    id: 4,
    mode: "ranked",
    tier: "tier1",
    points: 4,
    q: "What is the default round timer in ranked?",
    a: "3 minutes",
  },
  {
    id: 5,
    mode: "fun",
    tier: "mixed",
    points: 0,
    q: "Which operator has the best mustache?",
    a: "Subjective — Tachanka is acceptable",
  },
];

// ===== HELPERS =====
function pickQuestions(mode, tier, count = 5) {
  const pool = QUESTION_BANK.filter((q) => {
    if (mode === "fun") return true;
    if (mode === "ranked") return q.mode === "ranked" && q.tier === tier;
    return q.mode === mode;
  });
  return pool.slice(0, count);
}

export default function R6TriviaApp() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const [session, setSession] = useState(null);

  const tiers = [
    { id: "tier1", name: "Tier 1", points: 4 },
    { id: "tier2", name: "Tier 2", points: 3 },
    { id: "tier3", name: "Tier 3", points: 2 },
    { id: "tier4", name: "Tier 4", points: 1 },
  ];

  // ===== AUTH =====
  function handleRegister(e) {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return;
    const newUser = apiRegister({ ...form });
    setUser(newUser);
    setPage("profile");
  }

  useEffect(() => {
    if (user) setProfile(apiGetScores(user.username));
  }, [user, page]);

  // ===== SESSION ENGINE =====
  function startSession(mode, tier = null) {
    const qs = pickQuestions(mode, tier);
    setSession({
      mode,
      tier,
      index: 0,
      questions: qs,
      correct: 0,
      answered: 0,
    });
    setPage("quiz");
  }

  function answerQuestion(correct) {
    if (!session || !user) return;
    const q = session.questions[session.index];
    apiAddScore(user.username, session.mode, q.tier, q.points, correct);

    const next = session.index + 1;
    if (next >= session.questions.length) {
      setPage("results");
      return;
    }

    setSession({
      ...session,
      index: next,
      answered: session.answered + 1,
      correct: session.correct + (correct ? 1 : 0),
    });
  }

  // ===== UI PARTS =====
  function BigTitle({ children }) {
    return (
      <h1 className={`text-5xl md:text-6xl font-extrabold tracking-tight ${theme.text}`}>
        {children}
      </h1>
    );
  }

  function Panel({ children, className = "" }) {
    return (
      <Card className={`${theme.panel} ${theme.border} border rounded-2xl shadow-xl ${className}`}>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    );
  }

  function ProgressBar({ value }) {
    return (
      <div className="w-full bg-[#1a2744] rounded-full h-4">
        <div
          className="bg-blue-500 h-4 rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    );
  }

  // ===== PAGES =====
  function AuthPage() {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme.bg} ${theme.text}`}>
        <Panel className="w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              placeholder="Username"
              className="text-lg"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <Input
              placeholder="Email"
              className="text-lg"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Password"
              type="password"
              className="text-lg"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button className={`w-full text-lg font-bold rounded-xl ${theme.accent}`}>
              Register
            </Button>
          </form>
        </Panel>
      </div>
    );
  }

  function ProfilePage() {
    if (!user || !profile) return null;
    const accuracy = profile.answered
      ? Math.round((profile.correct / profile.answered) * 100)
      : 0;

    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <BigTitle>Player Profile</BigTitle>

          <Panel>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className={`${theme.textDim} font-semibold`}>Username</div>
                <div className="text-2xl font-bold">{user.username}</div>
              </div>
              <div>
                <div className={`${theme.textDim} font-semibold`}>Total Score</div>
                <div className="text-2xl font-bold">{profile.total}</div>
              </div>
              <div>
                <div className={`${theme.textDim} font-semibold`}>Accuracy</div>
                <div className="text-2xl font-bold">{accuracy}%</div>
              </div>
            </div>
          </Panel>

          <Button onClick={() => setPage("landing")} className={`rounded-xl font-bold ${theme.accent}`}>
            Back Home
          </Button>
        </div>
      </div>
    );
  }

  function Leaderboard() {
    const rows = Object.entries(fakeDB.scores)
      .map(([u, s]) => ({ u, total: s.total }))
      .sort((a, b) => b.total - a.total);

    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-3xl mx-auto space-y-4">
          <BigTitle>Leaderboard</BigTitle>
          {rows.map((r, i) => (
            <Panel key={r.u}>
              <div className="flex justify-between text-xl font-bold">
                <div>#{i + 1} {r.u}</div>
                <div>{r.total} pts</div>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  function QuizPage() {
    const q = session.questions[session.index];
    const progress = Math.round(
      (session.index / session.questions.length) * 100
    );
    const [flipped, setFlipped] = useState(false);

    useEffect(() => setFlipped(false), [session.index]);

    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-2xl mx-auto space-y-6">
          <ProgressBar value={progress} />

          <motion.div
            onClick={() => setFlipped(!flipped)}
            className="cursor-pointer"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <Panel className="min-h-[260px] flex items-center justify-center text-center">
              <div className="text-2xl font-bold">
                {!flipped ? q.q : q.a}
              </div>
            </Panel>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="rounded-xl text-lg font-bold"
              onClick={() => answerQuestion(false)}
            >
              Incorrect
            </Button>
            <Button
              className={`rounded-xl text-lg font-bold ${theme.accent}`}
              onClick={() => answerQuestion(true)}
            >
              Correct
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function ResultsPage() {
    if (!session) return null;
    const pct = Math.round((session.correct / session.questions.length) * 100);

    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-xl mx-auto space-y-6">
          <BigTitle>Session Results</BigTitle>
          <Panel>
            <div className="text-xl font-bold">
              Correct: {session.correct} / {session.questions.length}
            </div>
            <div className="text-xl font-bold">Score: {pct}%</div>
          </Panel>
          <Button className={`rounded-xl font-bold ${theme.accent}`} onClick={() => setPage("landing")}>
            Home
          </Button>
        </div>
      </div>
    );
  }

  function Landing() {
    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-5xl mx-auto space-y-10">
          <BigTitle>Tactical Trivia</BigTitle>

          <div className="flex flex-wrap gap-4">
            {!user && (
              <Button onClick={() => setPage("auth")} className={`font-bold text-lg rounded-xl ${theme.accent}`}>
                Create Account
              </Button>
            )}
            {user && (
              <>
                <Button onClick={() => setPage("profile")} className={`font-bold rounded-xl ${theme.accent}`}>
                  Profile
                </Button>
                <Button onClick={() => setPage("leaderboard")} className="font-bold rounded-xl">
                  Leaderboard
                </Button>
              </>
            )}
          </div>

          <Panel>
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.map((t) => (
                <Button
                  key={t.id}
                  className={`rounded-xl text-lg font-bold ${theme.accent}`}
                  onClick={() => startSession("ranked", t.id)}
                >
                  {t.name} — {t.points} pts/question
                </Button>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="grid md:grid-cols-2 gap-4">
              <Button className={`rounded-xl text-lg font-bold ${theme.accent}`} onClick={() => startSession("fun")}>
                Fun Mode (No Points)
              </Button>
              <Button className={`rounded-xl text-lg font-bold ${theme.accent}`} onClick={() => setPage("callouts") }>
                Map Callouts
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  function CalloutPage() {
    return (
      <div className={`min-h-screen p-6 ${theme.bg} ${theme.text}`}>
        <div className="max-w-xl mx-auto space-y-6">
          <BigTitle>Map Callouts</BigTitle>
          <Panel>
            <div className="aspect-video rounded-xl bg-[#1a2744] flex items-center justify-center font-bold text-xl">
              Map Image Area
            </div>
            <Input placeholder="Type room name" className="text-lg" />
            <Button className={`rounded-xl font-bold text-lg ${theme.accent}`}>
              Submit
            </Button>
          </Panel>
        </div>
      </div>
    );
  }

  if (page === "auth") return <AuthPage />;
  if (page === "profile") return <ProfilePage />;
  if (page === "leaderboard") return <Leaderboard />;
  if (page === "quiz") return <QuizPage />;
  if (page === "results") return <ResultsPage />;
  if (page === "callouts") return <CalloutPage />;
  return <Landing />;
}
