export interface Lecture {
  id: string;
  title: string;
  mins: number;
  done: boolean;
}

export interface Section {
  id: string;
  title: string;
  week: number;
  lectures: Lecture[];
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  source: string;
  sections: Section[];
}

export interface Card {
  id: string;
  lectureId: string;
  q: string;
  a: string;
}

export interface Session {
  at: string;
  focusSecs: number;
  breakSecs: number;
  focusMins: number;
  breaks: number;
  lectures: { id: string; mins: number }[];
}

export interface LogDay {
  mins: number;
}

export interface Workspace {
  id: string;
  name: string;
  examDate: string;
  hoursPerWeek: number;
  bufferDays: number;
  studyDays: number[];
  startTime: string;
  courses: Course[];
  notes: Record<string, string>;
  cards: Card[];
  actuals: Record<string, number>;
  doneAt: Record<string, string>;
  sessions: Session[];
  log: LogDay[];
}

export interface Store {
  schema: 1;
  spaces: Workspace[];
  savedAt: string;
}

export interface ExportFile {
  app: "studyframe";
  version: 1;
  exportedAt: string;
  spaces: Workspace[];
}

/** A lecture with the section and course it came from — the unit every view iterates. */
export interface FlatLecture {
  l: Lecture;
  s: Section;
  c: Course;
}
