export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  buffer: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  exercises: Exercise[];
}

export const WORKOUT_DATA: WorkoutSession[] = [
  {
    id: "spinta-1",
    name: "SPINTA 1",
    exercises: [
      { id: "s1-1", name: "Pressa 45° quad", sets: 3, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "s1-2", name: "Leg extension", sets: 3, reps: "12-15", rest: "2-3'", buffer: "0-2" },
      { id: "s1-3", name: "Lento avanti multipower", sets: 3, reps: "6-8", rest: "3-4'", buffer: "0-2" },
      { id: "s1-4", name: "Chest press macchina", sets: 3, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "s1-5", name: "Push down 2 passi dietro cavo", sets: 3, reps: "10-12", rest: "2-3'", buffer: "0-2" },
      { id: "s1-6", name: "French press gomiti appoggiati", sets: 2, reps: "10-12", rest: "2-3'", buffer: "0-2" },
    ]
  },
  {
    id: "tirata-1",
    name: "TIRATA 1",
    exercises: [
      { id: "t1-1", name: "Rematore manubri panca 30°", sets: 3, reps: "6-8", rest: "3-4'", buffer: "0-2" },
      { id: "t1-2", name: "T-bar petto appoggiato", sets: 2, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "t1-3", name: "Lat presa neutra", sets: 3, reps: "10-12", rest: "3-4'", buffer: "0-2" },
      { id: "t1-4", name: "Hyperextension 45° femorali", sets: 3, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "t1-5", name: "Crossover deltoide posteriore", sets: 3, reps: "10-12", rest: "2-3'", buffer: "0-2" },
      { id: "t1-6", name: "Curl manubri panca Scott", sets: 3, reps: "8-10", rest: "2-3'", buffer: "0-2" },
      { id: "t1-7", name: "Bayesian curl", sets: 2, reps: "10-12", rest: "2-3'", buffer: "0-2" },
    ]
  },
  {
    id: "spinta-2",
    name: "SPINTA 2",
    exercises: [
      { id: "s2-1", name: "Spinte manubri panca 30°", sets: 2, reps: "6-8", rest: "3-4'", buffer: "0-2" },
      { id: "s2-2", name: "Pec fly macchina/cavi", sets: 3, reps: "10-12", rest: "3-4'", buffer: "0-2" },
      { id: "s2-3", name: "Alzate laterali manubri in piedi", sets: 2, reps: "10-12", rest: "3-4'", buffer: "0-2" },
      { id: "s2-4", name: "Alzate laterali cavo mono", sets: 2, reps: "10-12", rest: "3-4'", buffer: "0-2" },
      { id: "s2-5", name: "Push down cavo", sets: 3, reps: "10-12", rest: "3-4'", buffer: "0-2" },
      { id: "s2-6", name: "Pressa 45 gradi", sets: 2, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "s2-7", name: "Leg extension", sets: 3, reps: "10-12", rest: "2-3'", buffer: "0-2" },
    ]
  },
  {
    id: "tirata-2",
    name: "TIRATA 2",
    exercises: [
      { id: "t2-1", name: "Stacco gambe semi-tese", sets: 2, reps: "6-8", rest: "3-4'", buffer: "0-2" },
      { id: "t2-2", name: "Leg curl sdraiato", sets: 3, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "t2-3", name: "Lat machine presa larga", sets: 2, reps: "6-8", rest: "3-4'", buffer: "0-2" },
      { id: "t2-4", name: "Pulley presa stretta/supina", sets: 3, reps: "8-10", rest: "3-4'", buffer: "0-2" },
      { id: "t2-5", name: "Row machine / rematore cavo", sets: 3, reps: "10-12", rest: "2-3'", buffer: "0-2" },
      { id: "t2-6", name: "Real delt machine", sets: 3, reps: "10-12", rest: "2-3'", buffer: "0-2" },
      { id: "t2-7", name: "Curl manubri in piedi/supinazione", sets: 3, reps: "8-10", rest: "2-3'", buffer: "0-2" },
    ]
  }
];
