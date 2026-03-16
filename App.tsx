import React, { useState, useEffect, useMemo } from 'react';
import { WORKOUT_DATA, WorkoutSession, Exercise } from './data';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Timer, 
  CheckCircle2, 
  Circle, 
  History, 
  Play, 
  Pause, 
  RotateCcw,
  Info,
  Calendar,
  LogOut,
  LogIn,
  TrendingUp,
  LayoutDashboard,
  ChevronDown,
  Filter,
  Share2,
  Smartphone,
  Copy,
  Trash2,
  Plus,
  X,
  Save,
  Loader2,
  Activity,
  Target,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, signIn, logOut, handleRedirectResult } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  doc,
  setDoc,
  getDocFromServer,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- Types ---
interface SetRecord {
  reps: string;
  weight: string;
  completed: boolean;
}

interface WorkoutLog {
  [exerciseId: string]: {
    sets: SetRecord[];
    notes: string;
  };
}

interface SavedWorkout {
  id: string;
  userId: string;
  sessionId: string;
  sessionName: string;
  date: Timestamp;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    notes?: string;
    sets: { reps: number; weight: number }[];
  }[];
}

// --- Helpers ---
const calculate1RM = (weight: number, reps: number) => {
  if (!weight || !reps || isNaN(weight) || isNaN(reps) || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight);
  // Brzycki Formula
  return Math.round(weight / (1.0278 - 0.0278 * reps));
};

// --- Components ---

const TimerComponent = ({ initialSeconds, autoStartKey }: { initialSeconds: string, autoStartKey?: number }) => {
  const parseSeconds = (s: string) => {
    const match = s.match(/(\d+)/);
    if (!match) return 60;
    return parseInt(match[1]) * 60;
  };

  const [seconds, setSeconds] = useState(parseSeconds(initialSeconds));
  const [isActive, setIsActive] = useState(false);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  useEffect(() => {
    if (autoStartKey) {
      setSeconds(parseSeconds(initialSeconds));
      setIsActive(true);
    }
  }, [autoStartKey]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      clearInterval(interval);
      if (isActive) playBeep();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setSeconds(parseSeconds(initialSeconds));
    setIsActive(false);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
      <Timer className="w-4 h-4 text-emerald-500" />
      <span className={`font-mono text-sm ${seconds === 0 ? 'text-red-500 animate-pulse' : 'text-zinc-300'}`}>
        {formatTime(seconds)}
      </span>
      <div className="flex gap-1">
        <button onClick={toggle} className="p-1 hover:bg-zinc-800 rounded transition-colors">
          {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        <button onClick={reset} className="p-1 hover:bg-zinc-800 rounded transition-colors">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const SplashScreen: React.FC = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.8,
        ease: "easeOut",
        repeat: Infinity,
        repeatType: "reverse"
      }}
      className="w-24 h-24 bg-[#d4af37] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#d4af37]/40 mb-6"
    >
      <Dumbbell className="text-black w-12 h-12" />
    </motion.div>
    <motion.h1 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-3xl font-black tracking-tighter italic text-white"
    >
      PROTOCOLLO 2.0
    </motion.h1>
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: 100 }}
      transition={{ delay: 0.5, duration: 1 }}
      className="h-1 bg-[#d4af37] mt-4 rounded-full"
    />
  </motion.div>
);

const LoginScreen: React.FC<{ onSignIn: () => void | Promise<any>, isInsideIframe: boolean }> = ({ onSignIn, isInsideIframe }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center"
  >
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-20 h-20 bg-[#d4af37] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#d4af37]/20 mb-8"
    >
      <Dumbbell className="text-black w-10 h-10" />
    </motion.div>
    <h1 className="text-3xl font-black tracking-tighter mb-2 italic gold-text">PROTOCOLLO 2.0</h1>
    <p className="text-zinc-500 mb-8 max-w-xs">Accedi per salvare i tuoi progressi e visualizzare i grafici di crescita.</p>
    
    <div className="w-full max-w-xs space-y-4">
      <button 
        onClick={onSignIn}
        className="w-full bg-[#d4af37] text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#c4a030] transition-all active:scale-95 shadow-xl shadow-[#d4af37]/10"
      >
        <LogIn className="w-5 h-5" />
        Accedi con Google
      </button>

      {isInsideIframe && (
        <div className="pt-4 space-y-4">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-2">Problemi con l'accesso?</p>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">Safari blocca l'accesso se sei dentro l'anteprima. Aprila nel browser per continuare.</p>
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full bg-zinc-800 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Apri in Safari / Chrome
            </button>
          </div>
        </div>
      )}
    </div>
  </motion.div>
);

const ManualEntryModal = ({ isOpen, onClose, onSave, user, history }: { isOpen: boolean, onClose: () => void, onSave: (workout: any) => Promise<void>, user: User, history: SavedWorkout[] }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [exercisesData, setExercisesData] = useState<{ [exId: string]: { sets: { weight: string, reps: string }[], notes: string } }>({});

  const session = WORKOUT_DATA[selectedSessionIdx];

  useEffect(() => {
    const initialData: any = {};
    session.exercises.forEach(ex => {
      initialData[ex.id] = {
        sets: Array(ex.sets).fill(null).map(() => ({ weight: '', reps: '' })),
        notes: ''
      };
    });
    setExercisesData(initialData);
  }, [selectedSessionIdx, session]);

  const handleSave = async () => {
    // Date validation
    const selectedDate = new Date(date);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    if (selectedDate > now) {
      alert("Non puoi inserire un allenamento nel futuro!");
      return;
    }
    if (selectedDate < oneYearAgo) {
      alert("La data inserita è troppo lontana nel passato. Controlla l'anno!");
      return;
    }

    const exercisesToSave = session.exercises.map(ex => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      notes: exercisesData[ex.id]?.notes || '',
      sets: exercisesData[ex.id]?.sets
        .filter(s => s.weight && s.reps)
        .map(s => ({ 
          weight: parseFloat(s.weight.toString().replace(',', '.')), 
          reps: parseInt(s.reps.toString()) 
        }))
    })).filter(ex => ex.sets.length > 0);

    if (exercisesToSave.length === 0) {
      alert("Inserisci almeno una serie!");
      return;
    }

    // Duplicate prevention
    const isDuplicate = history.some(w => {
      const wDate = w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date);
      const sDate = new Date(date);
      wDate.setHours(0, 0, 0, 0);
      sDate.setHours(0, 0, 0, 0);
      return w.sessionId === session.id && wDate.getTime() === sDate.getTime();
    });

    if (isDuplicate) {
      if (!window.confirm("Esiste già un allenamento salvato per questa data e sessione. Vuoi salvarne un altro?")) {
        return;
      }
    }

    await onSave({
      userId: user.uid,
      sessionId: session.id,
      sessionName: session.name,
      date: Timestamp.fromDate(new Date(date)),
      exercises: exercisesToSave
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#d4af37]/30 w-full max-w-lg rounded-[2rem] p-6 space-y-6 my-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black italic gold-text tracking-tighter">INSERIMENTO MANUALE</h2>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Data Allenamento</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm font-bold outline-none focus:border-[#d4af37] transition-all text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Sessione</label>
            <div className="relative">
              <select 
                value={selectedSessionIdx}
                onChange={(e) => setSelectedSessionIdx(parseInt(e.target.value))}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm font-bold outline-none focus:border-[#d4af37] transition-all appearance-none"
              >
                {WORKOUT_DATA.map((s, idx) => (
                  <option key={s.id} value={idx}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-6 pt-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {session.exercises.map(ex => (
              <div key={ex.id} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-[#d4af37]">{ex.name}</h4>
                <div className="space-y-2">
                  {exercisesData[ex.id]?.sets.map((set, sIdx) => (
                    <div key={sIdx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-black text-zinc-600 w-4">{sIdx + 1}</span>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="kg"
                        value={set.weight}
                        onChange={(e) => {
                          const newData = { ...exercisesData };
                          newData[ex.id].sets[sIdx].weight = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                          setExercisesData(newData);
                        }}
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-center outline-none focus:border-[#d4af37]"
                      />
                      <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="reps"
                        value={set.reps}
                        onChange={(e) => {
                          const newData = { ...exercisesData };
                          newData[ex.id].sets[sIdx].reps = e.target.value.replace(/[^0-9]/g, '');
                          setExercisesData(newData);
                        }}
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-center outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <textarea 
                    placeholder="Note esercizio..."
                    value={exercisesData[ex.id]?.notes || ''}
                    onChange={(e) => {
                      const newData = { ...exercisesData };
                      newData[ex.id].notes = e.target.value;
                      setExercisesData(newData);
                    }}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg p-3 text-[10px] h-16 outline-none focus:border-[#d4af37] transition-all resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#d4af37] text-black font-black py-4 rounded-2xl shadow-xl shadow-[#d4af37]/10 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          SALVA ALLENAMENTO
        </button>
      </motion.div>
    </motion.div>
  );
};

const BulkImportModal = ({ isOpen, onClose, onImport, user }: { isOpen: boolean, onClose: () => void, onImport: (workouts: any[]) => Promise<void>, user: User }) => {
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showIdGuide, setShowIdGuide] = useState(false);

  const handleImport = async () => {
    if (!csvData.trim()) return;
    setIsImporting(true);
    
    try {
      // Expected format: Date (YYYY-MM-DD), SessionID, ExerciseID, Weight, Reps, [Notes]
      // Example: 2023-10-01, spinta-1, panca-piana, 80, 8, Sentito bene
      const lines = csvData.trim().split('\n');
      const workoutMap = new Map<string, any>();

      lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 5) return;
        
        const [dateStr, sessId, exId, weight, reps, notes] = parts;
        const key = `${dateStr}_${sessId}`;
        
        if (!workoutMap.has(key)) {
          const session = WORKOUT_DATA.find(s => 
            s.id.toLowerCase() === sessId.toLowerCase() || 
            s.name.toLowerCase() === sessId.toLowerCase()
          );
          workoutMap.set(key, {
            userId: user.uid,
            sessionId: session?.id || sessId,
            sessionName: session?.name || sessId,
            date: Timestamp.fromDate(new Date(dateStr)),
            exercises: []
          });
        }

        const workout = workoutMap.get(key);
        let ex = workout.exercises.find((e: any) => 
          e.exerciseId.toLowerCase() === exId.toLowerCase() ||
          e.exerciseName.toLowerCase() === exId.toLowerCase()
        );
        if (!ex) {
          const session = WORKOUT_DATA.find(s => 
            s.id.toLowerCase() === sessId.toLowerCase() || 
            s.name.toLowerCase() === sessId.toLowerCase()
          );
          const exInfo = session?.exercises.find(e => 
            e.id.toLowerCase() === exId.toLowerCase() || 
            e.name.toLowerCase() === exId.toLowerCase()
          );
          ex = {
            exerciseId: exInfo?.id || exId,
            exerciseName: exInfo?.name || exId,
            notes: notes || '',
            sets: []
          };
          workout.exercises.push(ex);
        } else if (notes && !ex.notes) {
          ex.notes = notes;
        }
        ex.sets.push({ weight: parseFloat(weight), reps: parseInt(reps) });
      });

      await onImport(Array.from(workoutMap.values()));
      setCsvData('');
      onClose();
    } catch (err) {
      console.error(err);
      alert("Errore nel formato dei dati. Usa: AAAA-MM-GG, ID_Sessione, ID_Esercizio, Peso, Reps, [Note]");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#d4af37]/30 w-full max-w-lg rounded-[2rem] p-6 space-y-6 my-auto"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black italic gold-text tracking-tighter">IMPORTAZIONE MASSIVA</h2>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Formato CSV:</p>
              <button 
                onClick={() => setShowIdGuide(!showIdGuide)}
                className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest"
              >
                {showIdGuide ? 'Nascondi Guida ID' : 'Mostra Guida ID'}
              </button>
            </div>
            
            <AnimatePresence>
              {showIdGuide && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-black/50 rounded-xl p-4 border border-zinc-800 overflow-hidden custom-scrollbar max-h-48 overflow-y-auto"
                >
                  <div className="space-y-4 text-[10px] font-mono">
                    {WORKOUT_DATA.map(session => (
                      <div key={session.id} className="space-y-1">
                        <p className="text-[#d4af37] font-black">Sessione: {session.id} ({session.name})</p>
                        <div className="pl-2 border-l border-zinc-800 space-y-0.5">
                          {session.exercises.map(ex => (
                            <p key={ex.id} className="text-zinc-500">Ex: {ex.id} ({ex.name})</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <code className="block bg-black p-3 rounded-xl text-[10px] text-[#d4af37] border border-zinc-800 font-mono">
              AAAA-MM-GG, ID_Sessione, ID_Esercizio, Peso, Reps, [Note]
            </code>
            <textarea 
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="2024-01-10, spinta-1, s1-1, 90, 6, Sentito bene"
              className="w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-xs font-mono outline-none focus:border-[#d4af37] transition-all custom-scrollbar resize-none"
            />
          </div>
        </div>

        <button 
          onClick={handleImport}
          disabled={isImporting || !csvData.trim()}
          className="w-full bg-[#d4af37] text-black font-black py-4 rounded-2xl shadow-xl shadow-[#d4af37]/10 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
          AVVIA IMPORTAZIONE
        </button>
      </motion.div>
    </motion.div>
  );
};

const ChartContainer: React.FC<{ title: string, data: any[], dataKey: string, color: string }> = ({ title, data, dataKey, color }) => (
  <div className="hardware-card p-6 space-y-4 bg-black/40 border border-[#d4af37]/10">
    <div className="flex justify-between items-end">
      <div className="space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono leading-none">
            {data[data.length - 1][dataKey]}
          </span>
          <span className="text-[10px] font-black text-zinc-600 uppercase">
            {dataKey === 'volume' ? 'kg*reps' : 'kg'}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-1">Trend</p>
        <div className={`text-xs font-black font-mono ${data.length > 1 && data[data.length-1][dataKey] >= data[data.length-2][dataKey] ? 'text-emerald-500' : 'text-red-500'}`}>
          {data.length > 1 ? (data[data.length-1][dataKey] >= data[data.length-2][dataKey] ? '+' : '') : ''}
          {data.length > 1 ? (data[data.length-1][dataKey] - data[data.length-2][dataKey]).toFixed(1) : '0.0'}
        </div>
      </div>
    </div>
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#333" 
            fontSize={8} 
            tickLine={false} 
            axisLine={false} 
            dy={10} 
            fontFamily="JetBrains Mono"
          />
          <YAxis 
            stroke="#333" 
            fontSize={8} 
            tickLine={false} 
            axisLine={false} 
            fontFamily="JetBrains Mono"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#000', 
              border: '1px solid #d4af37', 
              borderRadius: '8px', 
              fontSize: '10px',
              fontFamily: 'JetBrains Mono',
              fontWeight: 'bold'
            }}
            itemStyle={{ color: '#d4af37' }}
            cursor={{ stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fillOpacity={1} 
            fill={`url(#color${dataKey})`} 
            strokeWidth={3} 
            dot={{ fill: '#000', stroke: color, strokeWidth: 2, r: 3 }} 
            activeDot={{ r: 5, strokeWidth: 0, fill: color }} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const ProgressDashboard = ({ history, onSeed, user }: { history: SavedWorkout[], onSeed: () => void, user: User }) => {
  const [viewMode, setViewMode] = useState<'exercise' | 'session'>('exercise');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(WORKOUT_DATA[0].id);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const allExercises = useMemo(() => {
    const map = new Map<string, string>();
    // First add all exercises from the plan to ensure they are visible
    WORKOUT_DATA.forEach(session => {
      session.exercises.forEach(ex => {
        map.set(ex.id, ex.name);
      });
    });
    // Then add any other exercises found in history (in case the plan changed)
    history.forEach(w => {
      if (w.exercises) {
        w.exercises.forEach(ex => {
          map.set(ex.exerciseId, ex.exerciseName);
        });
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [history]);

  useEffect(() => {
    if (allExercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(allExercises[0].id);
    }
  }, [allExercises, selectedExerciseId]);

  const getChartDataForExercise = (exId: string) => {
    if (!exId || history.length === 0) return [];
    
    // Find the exercise name for fallback matching
    const targetEx = allExercises.find(e => e.id === exId);
    const targetName = targetEx?.name.toLowerCase();

    return history
      .filter(w => w.exercises && w.exercises.some(ex => 
        ex.exerciseId === exId || 
        (targetName && ex.exerciseName.toLowerCase() === targetName)
      ))
      .map(w => {
        const ex = w.exercises.find(e => 
          e.exerciseId === exId || 
          (targetName && e.exerciseName.toLowerCase() === targetName)
        );
        if (!ex || !ex.sets || ex.sets.length === 0) return null;

        const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
        const totalVolume = ex.sets.reduce((acc, s) => acc + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0);
        const max1RM = Math.max(...ex.sets.map(s => calculate1RM(Number(s.weight) || 0, Number(s.reps) || 0)));
        
        let dateLabel = '';
        try {
          const dateObj = w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date);
          dateLabel = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        } catch (e) {
          dateLabel = '??/??';
        }

        return {
          date: dateLabel,
          weight: maxWeight,
          volume: totalVolume,
          oneRM: max1RM,
          timestamp: w.date instanceof Timestamp ? w.date.toMillis() : new Date(w.date).getTime()
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartData = useMemo(() => getChartDataForExercise(selectedExerciseId), [history, selectedExerciseId]);

  const stats = useMemo(() => {
    const totalWorkouts = history.length;
    const uniqueExercises = allExercises.length;
    const lastWorkout = history.length > 0 ? 
      (history[0].date instanceof Timestamp ? history[0].date.toDate() : new Date(history[0].date)).toLocaleDateString('it-IT') : 
      'Nessuno';
    
    return { totalWorkouts, uniqueExercises, lastWorkout };
  }, [history, allExercises]);

  const exportToCSV = () => {
    if (history.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,Data,Sessione,Esercizio,Serie,Peso,Reps,Note\n";
    
    history.forEach(w => {
      const date = (w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date)).toLocaleDateString('it-IT');
      w.exercises.forEach(ex => {
        ex.sets.forEach((s, idx) => {
          csvContent += `${date},${w.sessionName},${ex.exerciseName},${idx + 1},${s.weight},${s.reps},${ex.notes}\n`;
        });
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `workout_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSave = async (workout: any) => {
    try {
      await addDoc(collection(db, 'workouts'), workout);
      alert("Allenamento salvato!");
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio");
    }
  };

  const handleBulkImport = async (workouts: any[]) => {
    try {
      for (const w of workouts) {
        await addDoc(collection(db, 'workouts'), w);
      }
      alert(`Importati ${workouts.length} allenamenti!`);
    } catch (e) {
      console.error(e);
      alert("Errore durante l'importazione");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AnimatePresence>
        {isManualModalOpen && (
          <ManualEntryModal 
            isOpen={isManualModalOpen} 
            onClose={() => setIsManualModalOpen(false)} 
            onSave={handleManualSave}
            user={user}
            history={history}
          />
        )}
        {isBulkModalOpen && (
          <BulkImportModal 
            isOpen={isBulkModalOpen} 
            onClose={() => setIsBulkModalOpen(false)} 
            onImport={handleBulkImport}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Workout', value: stats.totalWorkouts, icon: Activity },
          { label: 'Esercizi', value: stats.uniqueExercises, icon: Target },
          { label: 'Ultimo', value: stats.lastWorkout, icon: Calendar },
        ].map((s, i) => (
          <div key={i} className="hardware-card p-4 text-center gold-glow">
            <s.icon className="w-4 h-4 mx-auto mb-2 text-[#d4af37]" />
            <div className="text-xl font-black font-mono leading-none mb-1">{s.value}</div>
            <div className="text-[8px] uppercase font-black tracking-widest text-zinc-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button 
          onClick={() => setIsManualModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#d4af37]/50 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#d4af37]" />
          Manuale
        </button>
        <button 
          onClick={() => setIsBulkModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#d4af37]/50 transition-all active:scale-95"
        >
          <Upload className="w-4 h-4 text-[#d4af37]" />
          Importa
        </button>
        <button 
          onClick={exportToCSV}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#d4af37]/50 transition-all active:scale-95"
        >
          <Download className="w-4 h-4 text-[#d4af37]" />
          Esporta
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
        <button 
          onClick={() => setViewMode('exercise')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'exercise' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-zinc-500'}`}
        >
          Esercizio Singolo
        </button>
        <button 
          onClick={() => setViewMode('session')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'session' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-zinc-500'}`}
        >
          Sessione Completa
        </button>
      </div>

      {/* Selectors */}
      <div className="space-y-3">
        {viewMode === 'exercise' ? (
          <>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Seleziona Esercizio</label>
            <div className="relative">
              <select 
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#d4af37] transition-all appearance-none cursor-pointer"
              >
                {allExercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </>
        ) : (
          <>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Seleziona Sessione</label>
            <div className="relative">
              <select 
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#d4af37]/20 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#d4af37] transition-all appearance-none cursor-pointer"
              >
                {WORKOUT_DATA.map(session => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {viewMode === 'exercise' ? (
          chartData.length > 1 ? (
            <>
              <ChartContainer title="Carico Massimo (kg)" data={chartData} dataKey="weight" color="#d4af37" />
              <ChartContainer title="Volume Totale (kg x reps)" data={chartData} dataKey="volume" color="#d4af37" />
              <ChartContainer title="Massimale Stimato (1RM)" data={chartData} dataKey="oneRM" color="#d4af37" />
            </>
          ) : (
            <div className="hardware-card p-12 text-center border-dashed border-zinc-800">
              <TrendingUp className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Dati insufficienti</h3>
              <p className="text-zinc-600 text-xs mt-2">Registra almeno 2 allenamenti per questo esercizio per vedere i grafici.</p>
            </div>
          )
        ) : (
          <div className="space-y-8">
            {WORKOUT_DATA.find(s => s.id === selectedSessionId)?.exercises.map(ex => {
              const exData = getChartDataForExercise(ex.id);
              return (
                <div key={ex.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                    <h4 className="text-xs font-black uppercase italic tracking-tight text-zinc-300">{ex.name}</h4>
                  </div>
                  {exData.length > 1 ? (
                    <ChartContainer title="Progress Carico (kg)" data={exData} dataKey="weight" color="#d4af37" />
                  ) : (
                    <div className="hardware-card p-8 text-center border-zinc-900 bg-zinc-900/10">
                      <p className="text-[10px] text-zinc-600 uppercase font-bold">Dati insufficienti per {ex.name}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Cronologia Recente</h3>
        <div className="space-y-3">
          {history.slice(0, 5).map((w, i) => (
            <div key={w.id} className="hardware-card p-4 flex items-center justify-between group hover:border-[#d4af37]/40 transition-all">
              <div>
                <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-tighter mb-1">
                  {(w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date)).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-sm font-black uppercase italic tracking-tight">{w.sessionName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-zinc-500">{w.exercises.length} Esercizi</div>
                <div className="text-[10px] text-zinc-700 font-black uppercase mt-1">Completato</div>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-xs uppercase font-black tracking-widest">Nessun allenamento salvato</div>
          )}
        </div>
      </div>
    </div>
  );
};

const SocialView = ({ onShare }: { onShare: () => void }) => {
  const handleFixApp = async () => {
    if (window.confirm("Questa azione pulirà la cache dell'app e proverà a risolvere i problemi di caricamento. L'app verrà riavviata. Vuoi procedere?")) {
      try {
        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        // Unregister SW
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }
        // Reload
        window.location.reload();
      } catch (e) {
        console.error(e);
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black italic gold-text tracking-tighter uppercase">Community</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Allenati insieme ai tuoi amici</p>
      </div>

      <div className="hardware-card p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/20">
          <Share2 className="w-10 h-10 text-[#d4af37]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black italic tracking-tight uppercase">Invita un Amico</h3>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Condividi l'app con i tuoi compagni di allenamento. Presto potrai vedere i loro progressi e sfidarli!
          </p>
        </div>
        <button 
          onClick={onShare}
          className="w-full gold-gradient text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase italic text-sm tracking-tighter shadow-[0_0_30px_rgba(212,175,55,0.3)]"
        >
          <Copy className="w-5 h-5" />
          Copia Link Invito
        </button>
      </div>

      <div className="hardware-card p-6 border border-red-500/20 bg-red-500/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-sm font-black uppercase italic tracking-tight">Problemi con l'App?</h3>
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold">
          Se l'app non si apre correttamente dalla Home o sembra bloccata, prova a forzare un ripristino.
        </p>
        <button 
          onClick={handleFixApp}
          className="w-full bg-zinc-900 text-red-500 font-black py-3 rounded-xl border border-zinc-800 text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all"
        >
          Ripristina App (Fix Home)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="hardware-card p-6 border-dashed border-zinc-800 opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-zinc-700" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-zinc-600 italic">Prossimamente</div>
              <div className="text-sm font-black text-zinc-700 uppercase">Classifica Amici</div>
            </div>
          </div>
        </div>
        <div className="hardware-card p-6 border-dashed border-zinc-800 opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-zinc-700" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-zinc-600 italic">Prossimamente</div>
              <div className="text-sm font-black text-zinc-700 uppercase">Feed Attività</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'workout' | 'progress' | 'history' | 'social'>('workout');
  const [selectedWorkout, setSelectedWorkout] = useState<SavedWorkout | null>(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('current_session_index');
      if (!saved) return 0;
      const parsed = parseInt(saved);
      if (isNaN(parsed) || parsed < 0 || parsed >= WORKOUT_DATA.length) return 0;
      return parsed;
    } catch (e) {
      return 0;
    }
  });
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>(() => {
    try {
      const saved = localStorage.getItem('workout_log_draft');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedWorkout[]>(() => {
    try {
      const saved = localStorage.getItem('workout_history_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [timerTrigger, setTimerTrigger] = useState<{ [exId: string]: number }>({});
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    setIsInsideIframe(window.self !== window.top);
  }, []);

  const currentSession = WORKOUT_DATA[currentSessionIndex] || WORKOUT_DATA[0];

  // Persist workout log to localStorage
  useEffect(() => {
    if (Object.keys(workoutLog).length > 0) {
      localStorage.setItem('workout_log_draft', JSON.stringify(workoutLog));
      localStorage.setItem('current_session_index', currentSessionIndex.toString());
    }
  }, [workoutLog, currentSessionIndex]);

  const seedHistory = async () => {
    if (!user) return;
    const sessions = WORKOUT_DATA.map(s => s.id);
    const now = new Date();
    
    try {
      for (let i = 4; i > 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        
        for (const sessId of sessions) {
          const session = WORKOUT_DATA.find(s => s.id === sessId);
          if (!session) continue;

          const exercises = session.exercises.map(ex => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            sets: Array(ex.sets).fill(null).map((_, idx) => ({
              reps: parseInt(ex.reps.split('-')[0]) + Math.floor(Math.random() * 2),
              weight: 40 + (idx * 5) + (4 - i) * 2 // Progressive increase
            }))
          }));

          await addDoc(collection(db, 'workouts'), {
            userId: user.uid,
            sessionId: sessId,
            sessionName: session.name,
            date: Timestamp.fromDate(date),
            exercises
          });
        }
      }
      alert("Dati storici caricati con successo!");
    } catch (err) {
      console.error(err);
    }
  };

  // Auth & Connection Test
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Handle redirect result for PWAs
        const result = await handleRedirectResult();
        if (result?.user) {
          setUser(result.user);
          setAuthLoading(false);
          return;
        }
      } catch (err: any) {
        console.error("Redirect Error:", err);
      }

      // Then listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (isMounted) {
          setUser(u);
          // Reduced delay for faster perceived loading
          setTimeout(() => {
            if (isMounted) setAuthLoading(false);
          }, 100);
          
          if (u) {
            // Test connection
            getDocFromServer(doc(db, 'test', 'connection')).catch(err => {
              if (err.message.includes('offline')) console.error("Firebase offline");
            });
          }
        }
      });

      return unsubscribe;
    };

    const unsubPromise = initAuth();

    return () => {
      isMounted = false;
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, []);

  // Fetch History
  useEffect(() => {
    if (!user) return;
    // Optimization: load only last 30 days of workouts by default
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', user.uid),
      where('date', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedWorkout));
      setHistory(logs);
      // Cache history for faster subsequent loads
      localStorage.setItem('workout_history_cache', JSON.stringify(logs));
    }, (error) => {
      // If the index is not ready or other error, fallback to simple query
      const fallbackQ = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(50)
      );
      onSnapshot(fallbackQ, (s) => {
        const logs = s.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedWorkout));
        setHistory(logs);
      });
    });
    return () => unsubscribe();
  }, [user]);

  // Initialize log
  useEffect(() => {
    setWorkoutLog(prev => {
      const newLog = { ...prev };
      let changed = false;
      
      currentSession.exercises.forEach(ex => {
        if (!newLog[ex.id] || !newLog[ex.id].sets || newLog[ex.id].sets.length === 0) {
          // Find last performance for this specific exercise
          const lastPerf = history.find(w => w.exercises.some(e => e.exerciseId === ex.id));
          const lastExData = lastPerf?.exercises.find(e => e.exerciseId === ex.id);
          
          if (lastExData && lastExData.sets && lastExData.sets.length > 0) {
            newLog[ex.id] = {
              sets: lastExData.sets.map(s => ({ 
                reps: (s.reps || '').toString(), 
                weight: (s.weight || '').toString(), 
                completed: false 
              })),
              notes: lastExData.notes || ''
            };
            
            // If the number of sets in the plan is different from the last performance, adjust
            if (newLog[ex.id].sets.length < ex.sets) {
              const lastSet = lastExData.sets[lastExData.sets.length - 1];
              const extraSets = Array(ex.sets - newLog[ex.id].sets.length).fill(null).map(() => ({
                reps: (lastSet.reps || '').toString(),
                weight: (lastSet.weight || '').toString(),
                completed: false
              }));
              newLog[ex.id].sets = [...newLog[ex.id].sets, ...extraSets];
            } else if (newLog[ex.id].sets.length > ex.sets) {
              newLog[ex.id].sets = newLog[ex.id].sets.slice(0, ex.sets);
            }
          } else {
            newLog[ex.id] = {
              sets: Array(ex.sets).fill(null).map(() => ({ reps: '', weight: '', completed: false })),
              notes: ''
            };
          }
          changed = true;
        }
      });
      
      return changed ? newLog : prev;
    });
  }, [currentSessionIndex, history, currentSession.id]);

  const parseNumericInput = (val: string) => {
    // Replace comma with dot and remove any non-numeric characters except dot
    return val.replace(',', '.').replace(/[^0-9.]/g, '');
  };

  const updateSet = (exId: string, setIndex: number, field: keyof SetRecord, value: any) => {
    let finalValue = value;
    if (field === 'weight' || field === 'reps') {
      finalValue = parseNumericInput(value.toString());
    }

    setWorkoutLog(prev => {
      const exLog = prev[exId] || {
        sets: Array(WORKOUT_DATA.find(s => s.exercises.some(e => e.id === exId))?.exercises.find(e => e.id === exId)?.sets || 0)
          .fill(null).map(() => ({ reps: '', weight: '', completed: false })),
        notes: ''
      };
      
      return {
        ...prev,
        [exId]: {
          ...exLog,
          sets: exLog.sets.map((set, i) => i === setIndex ? { ...set, [field]: value } : set)
        }
      };
    });
  };

  const updateNotes = (exId: string, value: string) => {
    setWorkoutLog(prev => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        notes: value
      }
    }));
  };

  const toggleSetCompleted = (exId: string, setIndex: number) => {
    const currentSet = workoutLog[exId]?.sets[setIndex];
    if (currentSet) {
      const newState = !currentSet.completed;
      updateSet(exId, setIndex, 'completed', newState);
      
      // Auto-timer trigger
      if (newState) {
        setTimerTrigger(prev => ({ ...prev, [exId]: Date.now() }));
      }
    }
  };

  const getLastPerformance = (exId: string) => {
    const lastWorkout = history.find(w => w.exercises.some(ex => ex.exerciseId === exId));
    if (!lastWorkout) return null;
    const ex = lastWorkout.exercises.find(e => e.exerciseId === exId);
    if (!ex || !ex.sets || ex.sets.length === 0) return null;
    
    const maxWeight = Math.max(...ex.sets.map(s => s.weight));
    const totalReps = ex.sets.reduce((acc, s) => acc + s.reps, 0);
    const avgReps = Math.round(totalReps / ex.sets.length);
    
    let dateStr = '';
    try {
      if (lastWorkout.date && typeof (lastWorkout.date as any).toDate === 'function') {
        dateStr = (lastWorkout.date as any).toDate().toLocaleDateString();
      } else if (lastWorkout.date instanceof Date) {
        dateStr = lastWorkout.date.toLocaleDateString();
      }
    } catch (e) {
      dateStr = 'Data n.d.';
    }
    
    return { weight: maxWeight, reps: avgReps, date: dateStr };
  };

  const saveWorkout = async () => {
    if (!user || isSaving) return;

    // Duplicate prevention: check if a workout for this session was already saved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isDuplicate = history.some(w => {
      const wDate = w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date);
      wDate.setHours(0, 0, 0, 0);
      return w.sessionId === currentSession.id && wDate.getTime() === today.getTime();
    });

    if (isDuplicate) {
      if (!window.confirm("Hai già salvato un allenamento per questa sessione oggi. Vuoi salvarne un altro?")) {
        return;
      }
    }

    setIsSaving(true);

    try {
      const exercisesToSave = currentSession.exercises.map(ex => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        notes: workoutLog[ex.id]?.notes || '',
        sets: workoutLog[ex.id]?.sets
          .filter(s => s.completed)
          .map(s => ({
            reps: parseInt(s.reps) || 0,
            weight: parseFloat(s.weight) || 0
          }))
      })).filter(ex => ex.sets.length > 0);

      if (exercisesToSave.length === 0) {
        alert("Completa almeno una serie prima di salvare!");
        setIsSaving(false);
        return;
      }

      await addDoc(collection(db, 'workouts'), {
        userId: user.uid,
        sessionId: currentSession.id,
        sessionName: currentSession.name,
        date: Timestamp.now(),
        exercises: exercisesToSave
      });

      // Reset current log
      const resetLog = { ...workoutLog };
      currentSession.exercises.forEach(ex => {
        resetLog[ex.id] = {
          sets: Array(ex.sets).fill(null).map(() => ({ reps: '', weight: '', completed: false })),
          notes: ''
        };
      });
      setWorkoutLog(resetLog);
      alert("Allenamento salvato con successo!");
      setView('progress');
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <Activity className="w-12 h-12 text-[#d4af37] mx-auto animate-pulse" />
          <h1 className="text-xl font-black uppercase italic gold-text">Errore Caricamento</h1>
          <p className="text-zinc-500 text-xs uppercase font-bold">Dati sessione non trovati.</p>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-3 bg-zinc-900 rounded-xl text-zinc-100 font-black uppercase text-[10px] tracking-widest border border-zinc-800"
          >
            Reset App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-[#d4af37]/30 flex flex-col">
      {authLoading ? (
        <SplashScreen />
      ) : !user ? (
        <LoginScreen onSignIn={signIn} isInsideIframe={isInsideIframe} />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-[#d4af37]/20 p-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#d4af37] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)] rotate-3">
                    <Dumbbell className="text-black w-7 h-7 -rotate-3" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tighter italic leading-none gold-text">PROTOCOLLO 2.0</h1>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mt-1">Status: <span className="text-[#d4af37]">Online</span> • {user.displayName?.split(' ')[0]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link dell'app copiato! Invialo a un amico per farlo allenare con te.");
                      setShowShareGuide(true);
                    }}
                    className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all active:scale-90"
                    title="Condividi App"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button onClick={logOut} className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-90">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

      <main className="max-w-2xl mx-auto p-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {view === 'workout' && (
          <>
            {/* Session Selector */}
            <div className="flex items-center justify-between mb-8 hardware-card p-2 gold-glow">
              <button 
                onClick={() => setCurrentSessionIndex(prev => (prev > 0 ? prev - 1 : WORKOUT_DATA.length - 1))}
                className="p-4 hover:bg-zinc-800 rounded-2xl transition-all active:scale-90 text-zinc-500 hover:text-[#d4af37]"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1">Sessione Attiva</p>
                <h2 className="text-2xl font-black tracking-tighter italic text-[#d4af37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                  {currentSession.name}
                </h2>
              </div>

              <button 
                onClick={() => setCurrentSessionIndex(prev => (prev < WORKOUT_DATA.length - 1 ? prev + 1 : 0))}
                className="p-4 hover:bg-zinc-800 rounded-2xl transition-all active:scale-90 text-zinc-500 hover:text-[#d4af37]"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Exercises List */}
            <div className="space-y-6">
              {currentSession.exercises.map((ex, idx) => (
                <motion.div 
                  key={ex.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group rounded-2xl border transition-all duration-300 ${
                    activeExerciseId === ex.id 
                      ? 'bg-zinc-900 border-emerald-500/50 shadow-xl shadow-emerald-500/5' 
                      : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div 
                    className="p-5 cursor-pointer"
                    onClick={() => setActiveExerciseId(activeExerciseId === ex.id ? null : ex.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md uppercase tracking-widest">Ex {idx + 1}</span>
                          <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest bg-[#d4af37]/10 px-2 py-0.5 rounded-md">Buffer: {ex.buffer}</span>
                        </div>
                        <h3 className="text-xl font-black leading-none tracking-tight group-hover:text-[#d4af37] transition-colors uppercase italic">
                          {ex.name}
                        </h3>
                        {(() => {
                          const last = getLastPerformance(ex.id);
                          if (!last) return null;
                          return (
                            <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1.5 font-mono uppercase tracking-tighter">
                              <History className="w-3 h-3" />
                              Precedente: <span className="text-[#d4af37] font-bold">{last.weight}kg x {last.reps}</span> ({last.date})
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black font-mono text-zinc-100 leading-none">{ex.sets}<span className="text-zinc-600 mx-1">x</span>{ex.reps}</div>
                        <div className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mt-1">Rest: {ex.rest}</div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {activeExerciseId === ex.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-zinc-800/50"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center mb-4">
                            <TimerComponent initialSeconds={ex.rest} autoStartKey={timerTrigger[ex.id]} />
                          </div>

                          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-zinc-600 px-2">
                            <div className="col-span-1">Set</div>
                            <div className="col-span-3">Peso (kg)</div>
                            <div className="col-span-3">Reps</div>
                            <div className="col-span-3 text-center">1RM Est.</div>
                            <div className="col-span-2 text-center">Done</div>
                          </div>

                          {(workoutLog[ex.id]?.sets || Array(ex.sets).fill(null).map(() => ({ reps: '', weight: '', completed: false }))).map((set, sIdx) => (
                            <div key={sIdx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-colors ${set.completed ? 'bg-[#d4af37]/5' : 'bg-black/20'}`}>
                              <div className="col-span-1 font-mono text-[10px] text-zinc-500">#{sIdx + 1}</div>
                              <div className="col-span-3">
                                <input 
                                  type="text" 
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={set.weight}
                                  onChange={(e) => updateSet(ex.id, sIdx, 'weight', e.target.value)}
                                  className="w-full bg-zinc-800 border-none rounded-lg p-2 text-sm font-mono focus:ring-1 focus:ring-[#d4af37] outline-none"
                                />
                              </div>
                              <div className="col-span-3">
                                <input 
                                  type="text" 
                                  inputMode="numeric"
                                  placeholder={ex.reps.split('-')[0]}
                                  value={set.reps}
                                  onChange={(e) => updateSet(ex.id, sIdx, 'reps', e.target.value)}
                                  className="w-full bg-zinc-800 border-none rounded-lg p-2 text-sm font-mono focus:ring-1 focus:ring-[#d4af37] outline-none"
                                />
                              </div>
                              <div className="col-span-3 text-center font-mono text-[10px] text-zinc-500">
                                {set.weight && set.reps ? `${calculate1RM(parseFloat(set.weight), parseInt(set.reps))}kg` : '-'}
                              </div>
                              <div className="col-span-2 flex justify-center">
                                <button 
                                  onClick={() => toggleSetCompleted(ex.id, sIdx)}
                                  className={`p-2 rounded-full transition-all relative ${set.completed ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-zinc-700 hover:text-zinc-500'}`}
                                >
                                  {set.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                  {set.completed && parseFloat(set.weight) > (getLastPerformance(ex.id)?.weight || 0) && (
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute -top-1 -right-1 bg-[#d4af37] text-[7px] font-black px-1 rounded-full border border-black text-black"
                                    >
                                      PR
                                    </motion.div>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="mt-4">
                            <label className="text-[10px] font-bold uppercase text-zinc-600 mb-1 block">Note Esercizio (es. altezza sedile, sensazioni)</label>
                            <textarea 
                              value={workoutLog[ex.id]?.notes || ''}
                              onChange={(e) => updateNotes(ex.id, e.target.value)}
                              placeholder="Inserisci note..."
                              className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {view === 'progress' && (
          <ProgressDashboard history={history} onSeed={seedHistory} user={user} />
        )}

        {view === 'history' && (
          <div className="space-y-6 pb-32">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-2xl font-black italic gold-text tracking-tighter">CRONOLOGIA</h2>
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{history.length} Sessioni</div>
            </div>
            
            <div className="space-y-4">
              {history.map((w) => (
                <motion.div 
                  key={w.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedWorkout(w)}
                  className="hardware-card p-5 space-y-4 active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mb-1">
                        {(w.date instanceof Timestamp ? w.date.toDate() : new Date(w.date)).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <h3 className="text-xl font-black italic uppercase tracking-tight group-hover:text-[#d4af37] transition-colors">{w.sessionName}</h3>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#d4af37] transition-colors" />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {w.exercises.map((ex, idx) => (
                      <span key={idx} className="text-[9px] font-black uppercase tracking-widest bg-black/40 border border-zinc-800 px-2 py-1 rounded-lg text-zinc-500">
                        {ex.exerciseName}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
              
              {history.length === 0 && (
                <div className="text-center py-20 space-y-4">
                  <History className="w-12 h-12 text-zinc-800 mx-auto" />
                  <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Nessun allenamento trovato</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'social' && (
          <SocialView onShare={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("Link dell'app copiato! Invialo a un amico per farlo allenare con te.");
            setShowShareGuide(true);
          }} />
        )}
      </main>

      {/* Workout Detail Modal */}
      <AnimatePresence>
        {selectedWorkout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl p-4 flex items-center justify-center overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0a0a] border border-[#d4af37]/30 w-full max-w-lg rounded-[2.5rem] p-8 space-y-8 my-auto"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-black text-[#d4af37] uppercase tracking-widest mb-1">
                    {(selectedWorkout.date instanceof Timestamp ? selectedWorkout.date.toDate() : new Date(selectedWorkout.date)).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter gold-text">{selectedWorkout.sessionName}</h2>
                </div>
                <button 
                  onClick={() => setSelectedWorkout(null)}
                  className="p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
                {selectedWorkout.exercises.map((ex, i) => (
                  <div key={i} className="space-y-3 p-5 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black uppercase italic tracking-tight text-zinc-200">{ex.exerciseName}</h4>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{ex.sets.length} Serie</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {ex.sets.map((s, si) => (
                        <div key={si} className="bg-black/40 p-3 rounded-2xl border border-zinc-800 text-center">
                          <div className="text-[8px] font-black text-zinc-600 uppercase mb-1">Set {si + 1}</div>
                          <div className="text-sm font-black font-mono">
                            {s.weight} <span className="text-[8px] text-zinc-500">kg</span>
                          </div>
                          <div className="text-[10px] font-black text-[#d4af37]">
                            {s.reps} <span className="text-[8px]">reps</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ex.notes && (
                      <div className="bg-black/20 p-3 rounded-2xl border border-[#d4af37]/10">
                        <p className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Note
                        </p>
                        <p className="text-xs text-zinc-400 italic">"{ex.notes}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    if (window.confirm("Sei sicuro di voler eliminare definitivamente questo allenamento?")) {
                      try {
                        await deleteDoc(doc(db, 'workouts', selectedWorkout.id));
                        setSelectedWorkout(null);
                      } catch (err) {
                        console.error("Errore eliminazione:", err);
                        alert("Errore durante l'eliminazione.");
                      }
                    }
                  }}
                  className="flex-1 bg-red-500/10 text-red-500 font-black py-5 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all uppercase italic tracking-tighter"
                >
                  Elimina
                </button>
                <button 
                  onClick={() => setSelectedWorkout(null)}
                  className="flex-[2] bg-zinc-900 text-zinc-400 font-black py-5 rounded-2xl border border-zinc-800 hover:text-white transition-all uppercase italic tracking-tighter"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share/Install Guide Modal */}
      <AnimatePresence>
        {showShareGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-6 flex items-center justify-center"
          >
            <div className="max-w-sm w-full space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold">Installa l'App</h2>
                {isInsideIframe ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl space-y-2">
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider">⚠️ Attenzione</p>
                    <p className="text-zinc-300 text-sm">Sei dentro l'anteprima. Per installarla correttamente, devi prima aprirla nel browser Safari.</p>
                    <button 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full bg-red-500 text-white text-xs font-bold py-2 rounded-lg"
                    >
                      Apri in Safari
                    </button>
                  </div>
                ) : (
                  <p className="text-zinc-400 text-sm">Segui questi passi per averla fissa sul tuo iPhone:</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-500">1</div>
                  <p className="text-sm">Tocca l'icona <span className="inline-block p-1 bg-zinc-800 rounded mx-1"><Share2 className="w-3 h-3" /></span> (Condividi) in basso su Safari.</p>
                </div>
                <div className="flex items-start gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-500">2</div>
                  <p className="text-sm">Scorri verso l'alto e seleziona <span className="font-bold text-white">"Aggiungi alla schermata Home"</span>.</p>
                </div>
                <div className="flex items-start gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-emerald-500">3</div>
                  <p className="text-sm">Tocca <span className="font-bold text-emerald-500">"Aggiungi"</span> in alto a destra.</p>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copiato! Mandalo ad Albe su WhatsApp.");
                  }}
                  className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all"
                >
                  <Copy className="w-5 h-5" />
                  Copia Link per Albe
                </button>
                <button 
                  onClick={() => setShowShareGuide(false)}
                  className="w-full mt-3 text-zinc-500 text-sm font-medium py-2"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-50">
        <div className="max-w-2xl mx-auto pointer-events-auto space-y-3">
          {/* Action Buttons (Only in Workout View) */}
          {view === 'workout' && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (window.confirm("Sei sicuro di voler cancellare i dati di questa sessione?")) {
                    const resetLog = { ...workoutLog };
                    currentSession.exercises.forEach(ex => {
                      resetLog[ex.id] = {
                        sets: Array(ex.sets).fill(null).map(() => ({ reps: '', weight: '', completed: false })),
                        notes: ''
                      };
                    });
                    setWorkoutLog(resetLog);
                  }
                }}
                className="bg-zinc-900/90 text-red-500 p-4 rounded-2xl border border-zinc-800 backdrop-blur-md active:scale-90 transition-all"
                title="Reset Sessione"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              <button 
                onClick={saveWorkout}
                disabled={isSaving}
                className="flex-1 gold-gradient text-black px-8 py-4 rounded-2xl font-black italic tracking-tighter shadow-[0_0_30px_rgba(212,175,55,0.3)] active:scale-95 disabled:opacity-50 uppercase flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salva Allenamento
                  </>
                )}
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex gap-2">
            <button 
              onClick={() => setView('workout')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${
                view === 'workout' 
                  ? 'bg-zinc-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 backdrop-blur-md'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">Workout</span>
            </button>
            <button 
              onClick={() => setView('progress')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${
                view === 'progress' 
                  ? 'bg-zinc-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 backdrop-blur-md'
              }`}
            >
              <TrendingUp className="w-5 h-5 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">Stats</span>
            </button>
            <button 
              onClick={() => setView('history')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${
                view === 'history' 
                  ? 'bg-zinc-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 backdrop-blur-md'
              }`}
            >
              <History className="w-5 h-5 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">Log</span>
            </button>
            <button 
              onClick={() => setView('social')}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 ${
                view === 'social' 
                  ? 'bg-zinc-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 backdrop-blur-md'
              }`}
            >
              <Target className="w-5 h-5 mb-1" />
              <span className="text-[8px] font-black uppercase tracking-widest">Social</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    )}
    </div>
  );
}
