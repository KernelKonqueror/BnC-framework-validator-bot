import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, setDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2, LogIn, LogOut, Send, Trophy, History, BrainCircuit, Sun, Moon } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

import casesData from './data/cases.json';

const CASES = casesData;

type Evaluation = {
  isMECE: boolean;
  meceExplanation: string;
  missingBucket: string;
  grade: "S" | "A" | "B" | "C";
  feedback: string;
};

type Attempt = {
  id: string;
  userId: string;
  caseText: string;
  framework: string;
  missingBucket: string;
  grade: string;
  feedback: string;
  createdAt: number | Date;
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [currentCase, setCurrentCase] = useState(CASES[0]);
  const [frameworkInput, setFrameworkInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Pick a random case on load
    setCurrentCase(CASES[Math.floor(Math.random() * CASES.length)]);
    
    // Auth listener
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u) {
        fetchHistory(u.uid);
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async (uid: string) => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "users", uid, "attempts"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      
      const attempts = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = data.createdAt;
        if (createdAt instanceof Timestamp) {
          createdAt = createdAt.toDate();
        } else if (typeof createdAt === 'number') {
          createdAt = new Date(createdAt);
        }
        return {
          id: doc.id,
          ...data,
          createdAt
        } as Attempt;
      });
      // limit to last 3 for the sidebar display? We can just slice it in render.
      setHistory(attempts);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/attempts`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frameworkInput.trim()) return;
    
    setIsSubmitting(true);
    setCurrentEvaluation(null);

    try {
      const resp = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseText: currentCase.text, customRubric: currentCase.rubric, framework: frameworkInput })
      });
      
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Evaluation failed");
      }
      
      const evaluation = data as Evaluation;
      setCurrentEvaluation(evaluation);

      // Save to Firebase if logged in
      if (user) {
        const attemptId = Date.now().toString() + Math.random().toString(36).substring(7);
        const attemptDoc = {
           userId: user.uid,
           caseText: currentCase.text,
           framework: frameworkInput,
           missingBucket: evaluation.missingBucket,
           grade: evaluation.grade,
           feedback: evaluation.feedback,
           createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, "users", user.uid, "attempts", attemptId), attemptDoc)
             .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/attempts/${attemptId}`));
             
        fetchHistory(user.uid);
      }
      
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextCase = () => {
    const remaining = CASES.filter(c => c.text !== currentCase.text);
    setCurrentCase(remaining[Math.floor(Math.random() * remaining.length)]);
    setFrameworkInput("");
    setCurrentEvaluation(null);
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const gradeColors: Record<string, string> = theme === 'dark' ? {
    'S': 'bg-violet-900 border-violet-700 text-violet-200',
    'A': 'bg-emerald-900 border-emerald-700 text-emerald-200',
    'B': 'bg-amber-900 border-amber-700 text-amber-200',
    'C': 'bg-red-900 border-red-700 text-red-200',
  } : {
    'S': 'bg-violet-100 text-violet-800 border-violet-300',
    'A': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'B': 'bg-amber-100 text-amber-800 border-amber-300',
    'C': 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors ${theme === 'dark' ? 'bg-neutral-900 text-neutral-200' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <header className={`flex items-center justify-between pb-6 border-b ${theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <BrainCircuit size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Framework Validator</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {!loadingAuth && !user ? (
                 <button onClick={handleSignIn} className={`flex items-center gap-2 text-sm font-medium border px-4 py-2 rounded-md transition-colors shadow-sm ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white' : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-800'}`}>
                   <LogIn size={16} /> Sign in
                 </button>
              ) : user ? (
                 <div className={`text-sm font-medium flex items-center gap-3 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                   <img src={user.photoURL || undefined} alt="avatar" className={`w-8 h-8 rounded-full border ${theme === 'dark' ? 'border-neutral-700' : 'border-neutral-200'}`} />
                   <span className="hidden sm:inline">{user.displayName || user.email}</span>
                   <button 
                     onClick={handleSignOut}
                     className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400 hover:text-red-400' : 'hover:bg-neutral-200 text-neutral-600 hover:text-red-600'}`}
                     aria-label="Sign out"
                     title="Sign out"
                   >
                     <LogOut size={16} />
                   </button>
                 </div>
              ) : null}
            </div>
          </header>

          {/* Case Card */}
          <section className={`rounded-2xl p-6 md:p-8 shadow-sm border relative ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'}`}>
            <div className="absolute top-0 right-0 p-6">
              <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Current Case</div>
            </div>
            <h2 className="text-xl md:text-2xl font-medium leading-relaxed mt-4">
              {currentCase.text}
            </h2>
            <div className="mt-6 flex gap-3">
              <button onClick={nextCase} className="text-sm font-medium text-blue-500 hover:text-blue-400 hover:underline">
                 Skip this case
              </button>
            </div>
          </section>

          {/* Submission Area */}
          <section>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="framework" className="block text-sm font-semibold mb-2">
                  Your Initial Framework
                </label>
                <textarea 
                  id="framework"
                  rows={6}
                  required
                  placeholder="e.g. 1. Revenue (Volume, Price) 2. Costs (Fixed, Variable)..."
                  className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 resize-y ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder-neutral-500' : 'bg-white border-neutral-300 text-neutral-800'}`}
                  value={frameworkInput}
                  onChange={(e) => setFrameworkInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !frameworkInput.trim()}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Evaluate Framework
                </button>
              </div>
            </form>
          </section>

          {/* Evaluation Results */}
          {currentEvaluation && (
            <section className={`rounded-2xl p-6 md:p-8 shadow-sm border animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'}`}>
              <div className={`flex items-center justify-between pb-4 border-b ${theme === 'dark' ? 'border-neutral-700' : 'border-neutral-100'}`}>
                 <h3 className="text-lg font-bold flex items-center gap-2">
                   <Trophy size={20} className="text-amber-500" />
                   Results
                 </h3>
                 <div className={`px-4 py-1.5 rounded-full border text-lg font-bold font-mono shadow-sm ${gradeColors[currentEvaluation.grade] || gradeColors['C']}`}>
                   Grade: {currentEvaluation.grade}
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <div className="text-xs uppercase font-bold tracking-wider text-neutral-500">MECE Check</div>
                    <div className="flex items-center gap-2">
                       {currentEvaluation.isMECE ? (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${theme === 'dark' ? 'bg-green-900/40 text-green-400 ring-green-900' : 'bg-green-50 text-green-700 ring-green-600/20'}`}>Passed</span>
                       ) : (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${theme === 'dark' ? 'bg-red-900/40 text-red-400 ring-red-900' : 'bg-red-50 text-red-700 ring-red-600/10'}`}>Failed</span>
                       )}
                    </div>
                    <p className={`text-sm leading-relaxed p-3 rounded-lg border ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-neutral-50 border-neutral-100 text-neutral-600'}`}>{currentEvaluation.meceExplanation}</p>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="text-xs uppercase font-bold tracking-wider text-rose-500">Missing Bucket</div>
                    <p className={`text-sm font-medium p-4 rounded-lg border leading-relaxed shadow-sm ${theme === 'dark' ? 'bg-rose-950/30 border-rose-900/50 text-rose-300' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                      {currentEvaluation.missingBucket}
                    </p>
                 </div>
              </div>

              <div className="pt-4 space-y-2">
                 <div className="text-xs uppercase font-bold tracking-wider text-neutral-500">Consulting Feedback</div>
                 <p className={`leading-relaxed ${theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'}`}>
                   {currentEvaluation.feedback}
                 </p>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Sidebar for History */}
      <aside className={`w-full md:w-80 lg:w-96 border-l flex flex-col pt-6 max-h-screen ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className={`px-6 flex items-center gap-2 pb-4 border-b ${theme === 'dark' ? 'border-neutral-800' : 'border-neutral-100'}`}>
          <History size={18} className="text-neutral-500" />
          <h2 className="text-lg font-semibold">Recent History</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!user ? (
             <div className={`text-center p-6 rounded-xl border ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'}`}>
               <p className="text-sm text-neutral-500 mb-4">Sign in to save and view your past attempts.</p>
               <button onClick={handleSignIn} className={`border px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${theme === 'dark' ? 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800' : 'bg-white border-neutral-300 hover:bg-neutral-50'}`}>Sign in with Google</button>
             </div>
          ) : loadingHistory ? (
             <div className="flex justify-center p-8">
               <Loader2 className="animate-spin text-neutral-500" size={24} />
             </div>
          ) : history.length === 0 ? (
             <p className="text-sm text-neutral-500 text-center italic mt-10">No attempts yet. Submit your first framework!</p>
          ) : (
             history.slice(0, 3).map((attempt) => (
                <div key={attempt.id} className={`rounded-xl p-4 border transition-colors ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'}`}>
                   <div className="flex justify-between items-start mb-2">
                      <div className={`px-2 py-0.5 text-xs font-bold rounded border ${gradeColors[attempt.grade] || gradeColors['C']}`}>
                         {attempt.grade}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {attempt.createdAt instanceof Date ? attempt.createdAt.toLocaleDateString() : ''}
                      </span>
                   </div>
                   <p className={`text-xs mb-3 line-clamp-2 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`} title={attempt.caseText}>
                     {attempt.caseText}
                   </p>
                   <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-xs uppercase text-neutral-500">Missing:</span>
                        <p className={`line-clamp-1 text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{attempt.missingBucket}</p>
                      </div>
                   </div>
                </div>
             ))
          )}
        </div>
      </aside>
    </div>
  );
}
