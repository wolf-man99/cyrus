import type { ISODate } from '@/lib/dates';
import type {
  ActionRecord,
  ActivityLog,
  Conversation,
  DomainMetric,
  Expense,
  Goal,
  Habit,
  HabitLog,
  HealthReport,
  Income,
  Investment,
  LearningResource,
  LifeDomain,
  Profile,
  Project,
  ProjectDomain,
  Reflection,
  ReflectionPeriod,
  Skill,
  SkillDomain,
  StoredMessage,
  Task,
  WeightLog,
  Workout,
} from '@/domain/types';
import type {
  ActivityEntry,
  ExpenseEntry,
  GoalUpdate,
  HealthReportInput,
  IncomeEntry,
  InvestmentInput,
  LearningResourceInput,
  MetricEntry,
  NewGoal,
  NewHabit,
  NewTask,
  ProfileUpdate,
  ProjectInput,
  ReflectionInput,
  SkillInput,
  TaskUpdate,
  WeightEntry,
  WorkoutEntry,
} from '@/domain/schemas';

/** Inclusive local-date range. Both ends optional. */
export interface DateRange {
  from?: ISODate;
  to?: ISODate;
  limit?: number;
}

export interface ActivityFilter extends DateRange {
  domain?: LifeDomain;
  kinds?: string[];
  goalId?: string;
}

export interface MetricFilter extends DateRange {
  domain?: LifeDomain;
  metrics?: string[];
}

/** A log table: list by date, add, delete. */
export interface LogStore<T, Input> {
  list(range?: DateRange): Promise<T[]>;
  create(input: Input): Promise<T>;
  remove(id: string): Promise<void>;
}

/**
 * The persistence contract for CYRUS.
 *
 *  - `SupabaseRepository` — real, per-user data protected by Row Level Security.
 *  - `DemoRepository`     — in-memory sample data, used only when no backend is configured.
 *
 * UI code and the assistant's tools depend only on this interface.
 * Lists are returned newest first unless stated otherwise.
 */
export interface Repository {
  readonly mode: 'demo' | 'supabase';

  profile: {
    get(): Promise<Profile>;
    update(patch: ProfileUpdate): Promise<Profile>;
  };

  tasks: {
    /** Tasks due on `date`, plus incomplete tasks carried over from earlier days. Sorted by time. */
    listForDay(date: ISODate): Promise<Task[]>;
    /** Incomplete tasks due after `date`, up to `days` ahead. Soonest first. */
    listUpcoming(date: ISODate, days: number): Promise<Task[]>;
    /** Tasks due within a range, any status. Soonest first. */
    listBetween(from: ISODate, to: ISODate): Promise<Task[]>;
    /** Case-insensitive title search, open tasks first. */
    search(query: string, limit?: number): Promise<Task[]>;
    create(input: NewTask): Promise<Task>;
    update(id: string, patch: TaskUpdate): Promise<Task>;
    setCompleted(id: string, completed: boolean): Promise<Task>;
    remove(id: string): Promise<void>;
  };

  habits: {
    list(): Promise<Habit[]>;
    create(input: NewHabit): Promise<Habit>;
    archive(id: string): Promise<void>;
    logsBetween(from: ISODate, to: ISODate): Promise<HabitLog[]>;
    setDone(habitId: string, date: ISODate, done: boolean): Promise<void>;
  };

  goals: {
    list(filter?: { domain?: LifeDomain; includeArchived?: boolean }): Promise<Goal[]>;
    create(input: NewGoal): Promise<Goal>;
    update(id: string, patch: GoalUpdate): Promise<Goal>;
  };

  metrics: {
    list(filter?: MetricFilter): Promise<DomainMetric[]>;
    record(input: MetricEntry): Promise<DomainMetric>;
    remove(id: string): Promise<void>;
  };

  activities: {
    list(filter?: ActivityFilter): Promise<ActivityLog[]>;
    create(input: ActivityEntry): Promise<ActivityLog>;
    remove(id: string): Promise<void>;
  };

  weight: LogStore<WeightLog, WeightEntry>;
  workouts: LogStore<Workout, WorkoutEntry>;
  expenses: LogStore<Expense, ExpenseEntry>;
  income: LogStore<Income, IncomeEntry>;

  investments: {
    list(): Promise<Investment[]>;
    create(input: InvestmentInput): Promise<Investment>;
    update(id: string, patch: Partial<InvestmentInput>): Promise<Investment>;
    archive(id: string): Promise<void>;
  };

  learning: {
    list(): Promise<LearningResource[]>;
    create(input: LearningResourceInput): Promise<LearningResource>;
    update(id: string, patch: Partial<LearningResourceInput>): Promise<LearningResource>;
  };

  skills: {
    list(domain?: SkillDomain): Promise<Skill[]>;
    create(input: SkillInput): Promise<Skill>;
    update(id: string, patch: Partial<SkillInput>): Promise<Skill>;
    archive(id: string): Promise<void>;
  };

  projects: {
    list(domain?: ProjectDomain): Promise<Project[]>;
    create(input: ProjectInput): Promise<Project>;
    update(id: string, patch: Partial<ProjectInput>): Promise<Project>;
  };

  healthReports: {
    list(): Promise<HealthReport[]>;
    upload(file: File, meta: HealthReportInput): Promise<HealthReport>;
    /** Short-lived URL to view the private file. */
    fileUrl(report: HealthReport): Promise<string>;
    remove(report: HealthReport): Promise<void>;
  };

  reflections: {
    list(period?: ReflectionPeriod, limit?: number): Promise<Reflection[]>;
    get(period: ReflectionPeriod, periodStart: ISODate): Promise<Reflection | null>;
    /** Creates or replaces the reflection for that period, including its goal links. */
    save(input: ReflectionInput): Promise<Reflection>;
  };

  conversations: {
    list(limit?: number): Promise<Conversation[]>;
    create(title?: string | null): Promise<Conversation>;
    messages(conversationId: string, limit?: number): Promise<StoredMessage[]>;
    append(
      conversationId: string,
      message: { role: 'user' | 'assistant'; content: string; actions?: ActionRecord[] },
    ): Promise<StoredMessage>;
    end(conversationId: string): Promise<void>;
  };
}
